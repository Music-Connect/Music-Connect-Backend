// DEPRECATED — autenticação migrada para Better Auth
// Este arquivo não é mais importado. As rotas de auth agora são
// gerenciadas automaticamente pelo Better Auth em src/index.ts
// via: app.all("/api/auth/*", ...)
//
// Novos endpoints:
//   POST /api/auth/sign-up/email   (era /register)
//   POST /api/auth/sign-in/email   (era /login)
//   POST /api/auth/sign-out        (era /logout)
//   POST /api/auth/forget-password (era /forgot-password)
//   POST /api/auth/reset-password  (igual)
//   GET  /api/auth/session         (novo)
export {};
