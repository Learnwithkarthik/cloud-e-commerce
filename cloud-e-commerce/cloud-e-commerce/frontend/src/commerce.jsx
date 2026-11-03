import React,{useEffect,useState} from 'react';
import {UserRound,LogIn,LogOut,PackageCheck,ShieldCheck,RefreshCw,ArrowLeft,Save} from 'lucide-react';
import './commerce.css';
const cash=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
async function api(path,options={}){
  const res=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let data;try{data=await res.json()}catch{data={detail:`HTTP ${res.status}`}}
  if(!res.ok)throw new Error(typeof data.detail==='string'?data.detail:'Request failed');
  return data;
}
export function AccountArea({user,onUserChange,onClose,onShop}){
  const [mode,setMode]=useState('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[orders,setOrders]=useState([]);
  async function loadOrders(){try{setOrders(await api('/api/account/orders'))}catch(e){setError(e.message)}}
  useEffect(()=>{if(user)loadOrders()},[user?.id]);
  async function submit(e){e.preventDefault();setError('');setBusy(true);try{const u=await api(`/api/account/${mode}`,{method:'POST',body:JSON.stringify(mode==='register'?{name,email,password}:{email,password})});onUserChange(u);setPassword('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function logout(){try{await api('/api/account/logout',{method:'POST'});onUserChange(null);setOrders([])}catch(e){setError(e.message)}}
  return <section className="commerce-area"><button className="commerce-back" onClick={onShop}><ArrowLeft size={17}/> Back to storefront</button>
  {!user?<div className="commerce-auth"><div className="commerce-icon"><UserRound/></div><h1>{mode==='register'?'Create your account':'Welcome back'}</h1><p>Save your demo orders and view them securely anytime.</p><div className="commerce-tabs"><button className={mode==='login'?'on':''} onClick={()=>{setMode('login');setError('')}}>Sign in</button><button className={mode==='register'?'on':''} onClick={()=>{setMode('register');setError('')}}>Register</button></div><form onSubmit={submit}>
  {mode==='register'&&<label>Your name<input required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>}
  <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
  <label>Password<input type="password" required minLength={mode==='register'?12:1} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'}/></label>
  {mode==='register'&&<small>Use at least 12 characters and a unique password. This is an educational demo—don't reuse your real passwords.</small>}
  {error&&<div className="commerce-error" role="alert">{error}</div>}
  <button type="submit" className="commerce-primary" disabled={busy}><LogIn size={17}/>{busy?'Please wait…':mode==='register'?'Create account':'Sign in'}</button></form></div>:<><div className="commerce-title"><div><span className="commerce-eyebrow">MY ACCOUNT</span><h1>Hello, {user.name}</h1><p>{user.email} · {user.role==='admin'?'Administrator':'Customer'}</p></div><button className="commerce-outline" onClick={logout}><LogOut size={17}/> Sign out</button></div><h2>My order history</h2><p className="commerce-help">Only orders placed while signed in are linked to your account. Older guest orders are not automatically claimed.</p>{error&&<p className="commerce-error">{error}</p>}{orders.length?orders.map(o=><div className="commerce-order" key={o.id}><div><strong>Order #{o.id}</strong><span>{new Date(o.created_at).toLocaleString()} · {o.status}</span><ul>{o.items.map((i,n)=><li key={n}>{i.product_name} × {i.quantity}</li>)}</ul></div><b>{cash(o.total)}</b></div>):<div className="commerce-empty"><PackageCheck size={32}/><h3>No linked orders yet</h3><p>Place a demo order while signed in and it will appear here.</p><button className="commerce-primary" onClick={onShop}>Browse products</button></div>}</>}
  </section>
}
export function AdminArea({user,onShop,onInventoryUpdated}){
  const [stats,setStats]=useState(null),[products,setProducts]=useState([]),[orders,setOrders]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(){setBusy(true);setError('');try{const [s,p,o]=await Promise.all([api('/api/admin/summary'),api('/api/products'),api('/api/admin/orders')]);setStats(s);setProducts(p);setOrders(o)}catch(e){setError(e.message)}finally{setBusy(false)}}
  useEffect(()=>{if(user?.role==='admin')refresh()},[user?.role]);
  async function stock(id,n){try{await api(`/api/admin/products/${id}/stock`,{method:'PATCH',body:JSON.stringify({stock:Number(n)})});await refresh();onInventoryUpdated()}catch(e){setError(e.message)}}
  async function status(id,value){try{await api(`/api/admin/orders/${id}/status`,{method:'PATCH',body:JSON.stringify({status:value})});await refresh()}catch(e){setError(e.message)}}
  if(user?.role!=='admin')return <section className="commerce-area"><h1>Admin access required</h1><button className="commerce-primary" onClick={onShop}>Back to store</button></section>;
  return <section className="commerce-area commerce-admin"><div className="commerce-title"><div><span className="commerce-eyebrow">OPERATIONS DASHBOARD</span><h1>Store management</h1><p>Live sales, orders, and inventory from PostgreSQL.</p></div><button className="commerce-outline" onClick={refresh} disabled={busy}><RefreshCw size={17}/> Refresh</button></div>{error&&<div className="commerce-error" role="alert">{error}</div>}
  {stats&&<div className="commerce-stats">{[['Demo revenue',cash(stats.revenue)],['Total orders',stats.orders],['Customers',stats.customers],['Low stock',stats.low_stock]].map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div>}
  <div className="commerce-panel"><div className="commerce-panel-title"><h2>Inventory management</h2><span>Changes are saved to the database</span></div><div className="commerce-table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Update</th></tr></thead><tbody>{products.map(p=><InventoryRow key={p.id} p={p} onSave={stock}/>)}</tbody></table></div></div>
  <div className="commerce-panel"><div className="commerce-panel-title"><h2>Recent orders</h2><span>Latest 100 demo orders</span></div><div className="commerce-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>#{o.id}</td><td>{o.customer_name}<small>{o.customer_email}</small></td><td>{cash(o.total)}</td><td>{new Date(o.created_at).toLocaleDateString()}</td><td><select value={o.status} onChange={e=>status(o.id,e.target.value)}>{['placed','processing','completed','cancelled'].map(x=><option key={x}>{x}</option>)}</select></td></tr>)}</tbody></table></div>{!orders.length&&<p className="commerce-help">No demo orders yet.</p>}</div><p className="commerce-help">This teaching dashboard tracks demo transactions only. Status changes do not issue payments, refunds or stock returns.</p></section>
}
function InventoryRow({p,onSave}){const [n,setN]=useState(String(p.stock));useEffect(()=>setN(String(p.stock)),[p.stock]);return <tr><td><b>{p.name}</b></td><td>{p.category}</td><td>{cash(p.price)}</td><td>{p.stock}</td><td><div className="commerce-stock"><input aria-label={`Stock for ${p.name}`} type="number" min="0" max="1000000" value={n} onChange={e=>setN(e.target.value)}/><button disabled={!/^\d+$/.test(n)||Number(n)===p.stock||Number(n)>1000000} onClick={()=>onSave(p.id,n)}><Save size={15}/> Save</button></div></td></tr>}
