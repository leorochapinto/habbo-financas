import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finanças do Hotel",
  description: "Gestão de entradas, saídas e perdas do hotel Habbo",
};

const MENU = [
  { href: "/", rotulo: "Painel" },
  { href: "/lancamentos", rotulo: "Lançamentos" },
  { href: "/relatorios", rotulo: "Relatórios" },
  { href: "/picpay", rotulo: "PicPay" },
  { href: "/categorias", rotulo: "Categorias" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <header className="border-b border-borda bg-cartao">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold">
              Finanças do Hotel
            </Link>
            <div className="flex flex-wrap gap-4 text-sm text-suave">
              {MENU.map((m) => (
                <Link key={m.href} href={m.href} className="hover:text-texto">
                  {m.rotulo}
                </Link>
              ))}
            </div>
            <Link href="/lancamentos/novo?natureza=perda" className="botao ml-auto">
              Registrar perda
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
