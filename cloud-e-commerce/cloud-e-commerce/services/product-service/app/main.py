import os
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException, Query

app = FastAPI(title="Cloud E-Commerce Product API", docs_url=None, redoc_url=None)

@contextmanager
def db_connection():
    with psycopg.connect(host=os.environ["PGHOST"], dbname=os.environ["PGDATABASE"], user=os.environ["PGUSER"], password=os.environ["PGPASSWORD"], row_factory=dict_row) as conn:
        yield conn

@app.get("/api/products/health")
def health():
    with db_connection() as conn:
        conn.execute("SELECT 1")
    return {"status": "ok", "service": "product-service"}

@app.get("/api/products")
def list_products(category: str | None = Query(default=None, max_length=60)):
    with db_connection() as conn:
        if category and category.lower() != "all":
            rows = conn.execute(
                "SELECT * FROM products WHERE lower(category) = lower(%s) ORDER BY id",
                (category,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM products ORDER BY id").fetchall()
    return [{**r, "price": float(r["price"])} for r in rows]

@app.get("/api/products/{product_id}")
def get_product(product_id: int):
    with db_connection() as conn:
        row = conn.execute("SELECT * FROM products WHERE id=%s", (product_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Product not found")
    return {**row, "price": float(row["price"])}
