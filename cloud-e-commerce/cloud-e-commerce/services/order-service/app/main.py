import os
import hashlib
from collections import defaultdict
from contextlib import contextmanager
from decimal import Decimal

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException, Cookie
from pydantic import BaseModel, EmailStr, Field, ConfigDict

app = FastAPI(title="Cloud E-Commerce Orders API", docs_url=None, redoc_url=None)

class CartItem(BaseModel):
    product_id: int = Field(ge=1)
    quantity: int = Field(ge=1, le=20)

class PlaceOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    customer_name: str = Field(min_length=2, max_length=120)
    customer_email: EmailStr
    items: list[CartItem] = Field(min_length=1, max_length=30)

@contextmanager
def db_connection():
    with psycopg.connect(host=os.environ["PGHOST"], dbname=os.environ["PGDATABASE"], user=os.environ["PGUSER"], password=os.environ["PGPASSWORD"], row_factory=dict_row) as conn:
        yield conn

@app.get("/api/orders/health")
def health():
    with db_connection() as conn:
        conn.execute("SELECT 1")
    return {"status": "ok", "service": "order-service"}

@app.post("/api/orders", status_code=201)
def place_order(payload: PlaceOrderRequest, cloudcart_session: str | None = Cookie(default=None)):
    quantities: dict[int, int] = defaultdict(int)
    for item in payload.items:
        quantities[item.product_id] += item.quantity
    if any(q > 20 for q in quantities.values()):
        raise HTTPException(status_code=422, detail="Maximum quantity per product is 20")

    # Server recomputes prices and atomically reserves stock. Never trust prices from a browser.
    with db_connection() as conn:
        with conn.transaction():
            customer_id = None
            if cloudcart_session:
                match = conn.execute("""SELECT a.id, a.email FROM customer_sessions s
                    JOIN customer_accounts a ON a.id=s.customer_id
                    WHERE s.token_hash=%s AND s.expires_at > NOW()""", (hashlib.sha256(cloudcart_session.encode()).hexdigest(),)).fetchone()
                if not match:
                    raise HTTPException(status_code=401, detail="Session expired. Sign in again")
                customer_id = match['id']
                # Orders must never be associated with a different user's email.
                order_email = match['email']
            else:
                order_email = str(payload.customer_email).lower()
            products = conn.execute(
                "SELECT id, name, price, stock FROM products WHERE id = ANY(%s) ORDER BY id FOR UPDATE",
                (list(quantities),),
            ).fetchall()
            if len(products) != len(quantities):
                raise HTTPException(status_code=404, detail="One or more products no longer exist")
            for product in products:
                if product["stock"] < quantities[product["id"]]:
                    raise HTTPException(status_code=409, detail=f"Not enough stock for {product['name']}")
            total = sum((p["price"] * quantities[p["id"]] for p in products), Decimal("0.00"))
            order = conn.execute(
                "INSERT INTO orders (customer_name, customer_email, total, customer_id) VALUES (%s,%s,%s,%s) RETURNING id, status",
                (payload.customer_name.strip(), order_email, total, customer_id),
            ).fetchone()
            for product in products:
                qty = quantities[product["id"]]
                conn.execute("UPDATE products SET stock=stock-%s WHERE id=%s", (qty, product["id"]))
                conn.execute(
                    "INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (%s,%s,%s,%s,%s)",
                    (order["id"], product["id"], product["name"], product["price"], qty),
                )
    return {"order_id": order["id"], "status": order["status"], "total": float(total), "message": "Demo order placed successfully. No payment was collected."}
