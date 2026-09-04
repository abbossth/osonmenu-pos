# OsonMenu POS — Desktop (Electron)

Oshpaz/kassir terminali. `osonmenu-pos` serveriga (Next.js) ulanadi, buyurtmalarni
real-time (Pusher) yoki polling orqali oladi, lokal SQLite'da saqlaydi va termal
printerga chek chiqaradi.

## Ishga tushirish

```bash
npm install       # birinchi marta better-sqlite3 ni Electron ABI uchun qayta quradi
npm run dev       # dev rejimida ishga tushirish (hot reload)
npm run build     # production build (out/)
npm start         # build qilingan versiyani preview qilish
npm run dist      # electron-builder bilan o'rnatuvchi (.exe/.dmg) yasash
```

Birinchi marta ishga tushganda **Sozlash** ekrani chiqadi: server URL, restoran
slug va printerlarni tanlash kerak (`electron-store` orqali saqlanadi).

## Arxitektura

- `electron/main.ts` — oyna, SQLite (`better-sqlite3`), `electron-store` va barcha IPC handlerlar
- `electron/preload.ts` — `window.api` (contextBridge) orqali xavfsiz IPC ko'prigi
- `electron/printer.ts` — `node-thermal-printer` orqali tizim printeriga chop etish
- `src/utils/orderManager.ts` — Pusher ulanishi + 3s polling fallback
- `src/utils/sync.ts` — har 30s: lokal o'zgarishlarni serverga yuborish + yangilarni olish
- `src/utils/printer.ts` — oshpaz/kassir chek matnlarini formatlash
- `db/schema.sql` — SQLite sxemasi (hujjat sifatida; runtime sxema `main.ts` ichida)
