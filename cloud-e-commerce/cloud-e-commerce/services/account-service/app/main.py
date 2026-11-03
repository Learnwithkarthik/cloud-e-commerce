"""Customer login, private order history, and administrator inventory/order APIs.
Educational application: no real payments; security review required before real customer use.
"""
import hashlib
import hmac
import os
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import psycopg
from psycopg.rows import dict_row
from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field

app = FastAPI(title="CloudCart Accounts & Admin", docs_url=None, redoc_url=None)
COOKIE = "cloudcart_session"

@app.middleware('http')
async def same_origin_mutations(request: Request, call_next):
    # Reject browser cross-origin form/fetch mutations (cookie-based session).
    if request.method in {'POST','PUT','PATCH','DELETE'}:
        origin = request.headers.get('origin')
        if origin:
            u = urlparse(origin)
            if u.scheme != 'https' or u.netloc != request.headers.get('host'):
                from fastapi.responses import JSONResponse
                return JSONResponse({'detail':'Cross-origin request blocked'},status_code=403)
    return await call_next(request)

SESSION_DAYS = 7

@contextmanager
def connect():
    with psycopg.connect(host=os.environ["PGHOST"], dbname=os.environ["PGDATABASE"], user=os.environ["PGUSER"], password=os.environ["PGPASSWORD"], row_factory=dict_row) as conn:
        yield conn

def pw_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310000)
    return salt.hex() + ":" + digest.hex()

def pw_valid(password: str, stored: str) -> bool:
    try:
        salt_hex, expected = stored.split(":", 1)
        actual = pw_hash(password, bytes.fromhex(salt_hex)).split(":", 1)[1]
        return hmac.compare_digest(expected, actual)
    except (ValueError, TypeError):
        return False

class Register(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

class Login(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str

class StockUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stock: int = Field(ge=0, le=1000000)

class OrderStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str

ALLOWED_STATUSES = {"placed", "processing", "completed", "cancelled"}

def public_user(row):
    return {"id": row["id"], "name": row["display_name"], "email": row["email"], "role": row["role"]}

def current_user(session: str | None = Cookie(default=None, alias=COOKIE)):
    if not session:
        raise HTTPException(401, "Please sign in")
    token_hash = hashlib.sha256(session.encode()).hexdigest()
    with connect() as db:
        row = db.execute("""
            SELECT a.id, a.display_name, a.email, a.role
            FROM customer_sessions s JOIN customer_accounts a ON a.id = s.customer_id
            WHERE s.token_hash=%s AND s.expires_at > NOW()
        """, (token_hash,)).fetchone()
    if not row:
        raise HTTPException(401, "Session expired. Please sign in again")
    return row

def admin_user(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Administrator access required")
    return user

def start_session(response: Response, user_id: int):
    token = secrets.token_urlsafe(40)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with connect() as db:
        db.execute("INSERT INTO customer_sessions (token_hash,customer_id,expires_at) VALUES (%s,%s,%s)", (token_hash,user_id, datetime.now(timezone.utc)+timedelta(days=SESSION_DAYS)))
    response.set_cookie(COOKIE, token, max_age=SESSION_DAYS*86400, httponly=True, secure=True, samesite="lax", path="/")

@app.get('/api/account/health')
def health():
    with connect() as db:
        db.execute('SELECT 1')
    return {"status":"ok"}

@app.post('/api/account/register', status_code=201)
def register(data: Register, response: Response):
    email = str(data.email).lower()
    try:
        with connect() as db:
            row = db.execute("INSERT INTO customer_accounts(display_name,email,password_hash) VALUES (%s,%s,%s) RETURNING id,display_name,email,role", (data.name.strip(), email, pw_hash(data.password))).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409,"An account with this email already exists")
    start_session(response, row['id'])
    return public_user(row)

@app.post('/api/account/login')
def login(data: Login, response: Response):
    with connect() as db:
        row = db.execute("SELECT * FROM customer_accounts WHERE email=%s", (str(data.email).lower(),)).fetchone()
    if not row or not pw_valid(data.password, row['password_hash']):
        raise HTTPException(401,"Invalid email or password")
    start_session(response,row['id'])
    return public_user(row)

@app.post('/api/account/logout')
def logout(response: Response, session: str | None = Cookie(default=None, alias=COOKIE)):
    if session:
        with connect() as db:
            db.execute("DELETE FROM customer_sessions WHERE token_hash=%s",(hashlib.sha256(session.encode()).hexdigest(),))
    response.delete_cookie(COOKIE, path="/", secure=True, httponly=True, samesite="lax")
    return {"ok": True}

@app.get('/api/account/me')
def me(user=Depends(current_user)):
    return public_user(user)

@app.get('/api/account/orders')
def my_orders(user=Depends(current_user)):
    with connect() as db:
        rows = db.execute("SELECT id, total, status, created_at FROM orders WHERE customer_id=%s ORDER BY created_at DESC LIMIT 100", (user['id'],)).fetchall()
        for row in rows:
            row['items'] = db.execute("SELECT product_name, quantity, unit_price FROM order_items WHERE order_id=%s ORDER BY id", (row['id'],)).fetchall()
    return [{**r,'total':float(r['total']),'items':[{**i,'unit_price':float(i['unit_price'])} for i in r['items']]} for r in rows]

@app.get('/api/admin/summary')
def summary(user=Depends(admin_user)):
    with connect() as db:
        totals = db.execute("SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders").fetchone()
        catalog = db.execute("SELECT COUNT(*) AS products, COALESCE(SUM(stock),0) AS stock, COUNT(*) FILTER(WHERE stock<10) AS low_stock FROM products").fetchone()
        accounts = db.execute("SELECT COUNT(*) AS customers FROM customer_accounts WHERE role='customer'").fetchone()
    return {**totals,**catalog,**accounts,'revenue':float(totals['revenue'])}

@app.get('/api/admin/orders')
def all_orders(user=Depends(admin_user)):
    with connect() as db:
        rows = db.execute("SELECT id,customer_name,customer_email,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 100").fetchall()
    return [{**r,'total':float(r['total'])} for r in rows]

@app.patch('/api/admin/products/{product_id}/stock')
def set_stock(product_id: int, data: StockUpdate, user=Depends(admin_user)):
    with connect() as db:
        row = db.execute("UPDATE products SET stock=%s WHERE id=%s RETURNING id,name,stock", (data.stock,product_id)).fetchone()
    if not row:
        raise HTTPException(404,"Product not found")
    return row

@app.patch('/api/admin/orders/{order_id}/status')
def update_order_status(order_id: int, data: OrderStatus, user=Depends(admin_user)):
    if data.status not in ALLOWED_STATUSES:
        raise HTTPException(422,"Invalid order status")
    with connect() as db:
        row = db.execute("UPDATE orders SET status=%s WHERE id=%s RETURNING id,status", (data.status,order_id)).fetchone()
    if not row:
        raise HTTPException(404,"Order not found")
    return row
