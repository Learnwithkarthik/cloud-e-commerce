"""Run explicitly via: docker compose exec account-service python -m app.promote_admin user@example.com"""
import sys
from .main import connect

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python -m app.promote_admin registered-email@example.com')
    email = sys.argv[1].strip().lower()
    with connect() as db:
        row = db.execute("UPDATE customer_accounts SET role='admin' WHERE email=%s RETURNING id,email",(email,)).fetchone()
    if not row:
        raise SystemExit('Account not found. Register in the website first.')
    print('Admin role granted to registered account:',row['email'])
