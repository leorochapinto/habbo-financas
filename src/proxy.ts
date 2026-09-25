import { NextResponse, type NextRequest } from "next/server";

// Senha única de acesso ao painel (HTTP Basic). Defina APP_USUARIO e APP_SENHA no .env.
// Sem APP_SENHA o painel fica aberto: aceitável só rodando na sua máquina.
export function proxy(request: NextRequest) {
  const senha = process.env.APP_SENHA;
  if (!senha) return NextResponse.next();

  const usuario = process.env.APP_USUARIO ?? "admin";
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const [u, ...s] = atob(header.slice(6)).split(":");
    if (u === usuario && s.join(":") === senha) return NextResponse.next();
  }
  return new NextResponse("Acesso restrito", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Financas", charset="UTF-8"' },
  });
}

export const config = {
  // O retorno do PicPay tem autenticação própria (x-seller-token).
  matcher: ["/((?!api/picpay/callback|_next/static|_next/image|favicon.ico).*)"],
};
