# Coolify Deployment

โปรเจกต์นี้พร้อม deploy ด้วย Dockerfile บน Coolify

## Environment Variables

ตั้งค่า Environment Variables ใน Coolify โดยไม่ต้องใส่เครื่องหมาย quote:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
APP_ENV=production
NODE_ENV=production
PORT=3000
```

ถ้าใช้ Prisma Postgres / pooled connection ให้ใช้ `DATABASE_URL` ที่ Prisma ให้มาได้โดยตรง

## Build

Coolify จะตรวจพบ `Dockerfile` และ build image ให้อัตโนมัติ

ระหว่าง build จะใช้ placeholder database URL สำหรับ `prisma generate` เท่านั้น ข้อมูลจริงจะถูกใช้ตอน runtime จาก Environment Variables ของ Coolify

## Start

Container ใช้คำสั่งนี้:

```bash
npm run start:prod
```

คำสั่งนี้จะทำสองอย่าง:

```bash
prisma migrate deploy
next start -H 0.0.0.0 -p ${PORT:-3000}
```

ดังนั้นทุกครั้งที่ deploy ระบบจะ apply migration ที่ยังค้างอยู่ก่อน start app

## Seed Data

Seed data ไม่ถูกรันอัตโนมัติใน production เพื่อป้องกันข้อมูลจริงถูกเปลี่ยนโดยไม่ตั้งใจ

หากเป็นฐานข้อมูลใหม่และต้องการบัญชีเริ่มต้น ให้รันครั้งเดียวใน Coolify terminal:

```bash
npm run db:seed
```

บัญชีเริ่มต้น:

```text
system / system1234
owner / owner1234
staff01 / staff1234
```

หลังเข้า production จริงควรเปลี่ยนรหัสผ่านทันที

## Local Docker Test

```bash
docker build -t leaf-chill-daily:coolify .
docker run --env-file .env -p 3010:3000 leaf-chill-daily:coolify
```

เปิดที่:

```text
http://localhost:3010/login
```

## Login Cookie Note

Production uses a secure session cookie when the request is HTTPS.

If you test the Coolify deployment through plain `http://` and login returns to the login page, set this temporarily:

```text
COOKIE_SECURE=false
```

For the real public HTTPS domain, use:

```text
COOKIE_SECURE=true
```
