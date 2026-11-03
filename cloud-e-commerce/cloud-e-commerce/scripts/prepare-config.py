#!/usr/bin/env python3
"""Run from application root where compose.yaml and nginx/default.conf live.
Add the account-service safely without changing existing published ports or env secrets.
"""
from pathlib import Path
import sys
root=Path.cwd()
compose=root/'compose.yaml'
nginx=root/'nginx/default.conf'
if not compose.is_file() or not nginx.is_file():
    sys.exit('Run from the application folder containing compose.yaml and nginx/default.conf')
c=compose.read_text()
if '  account-service:\n' not in c:
    needle='  frontend:\n'
    if c.count(needle)!=1:sys.exit('Unexpected Compose structure. Inspect manually; nothing changed.')
    service='''  account-service:
    build: ./services/account-service
    restart: unless-stopped
    environment:
      PGHOST: db
      PGDATABASE: ${POSTGRES_DB}
      PGUSER: ${POSTGRES_USER}
      PGPASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
    networks: [internal]

'''
    c=c.replace(needle,service+needle)
# Gateway depends-on is optional: nginx can retry until service ready, but make sure it waits.
if '      - account-service\n' not in c:
    x='      - order-service\n'
    if c.count(x)!=1:sys.exit('Unexpected gateway depends_on. Inspect manually; nothing changed.')
    c=c.replace(x,x+'      - account-service\n')
n=nginx.read_text()
if 'location /api/account' not in n:
    anchor='    location / {'
    if n.count(anchor)!=1:sys.exit('Unexpected nginx configuration. Inspect manually; nothing changed.')
    routes='''    location /api/account {
        proxy_pass http://account-service:8000;
        proxy_set_header Host $host;
    }
    location /api/admin {
        proxy_pass http://account-service:8000;
        proxy_set_header Host $host;
    }
'''
    n=n.replace(anchor,routes+anchor)
# Only after all validation pass, write both files. Back up originals.
for path in (compose,nginx):
    bak=path.with_suffix(path.suffix+'.pre-v3')
    if not bak.exists():bak.write_text(path.read_text())
compose.write_text(c)
nginx.write_text(n)
print('Updated Compose and gateway routing; existing ports, database volume, and TLS config preserved.')
