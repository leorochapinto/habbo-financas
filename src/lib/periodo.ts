import { hojeISO } from "./dinheiro";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Lê ?de= e ?ate= da URL; sem eles, usa o mês corrente. */
export function periodoDaUrl(sp: Record<string, string | string[] | undefined>): {
  de: string;
  ate: string;
} {
  const hoje = hojeISO();
  const inicioDoMes = `${hoje.slice(0, 7)}-01`;
  const de = typeof sp.de === "string" && DATA.test(sp.de) ? sp.de : inicioDoMes;
  const ate = typeof sp.ate === "string" && DATA.test(sp.ate) ? sp.ate : hoje;
  return de <= ate ? { de, ate } : { de: ate, ate: de };
}

export function texto(sp: Record<string, string | string[] | undefined>, chave: string): string {
  const v = sp[chave];
  return typeof v === "string" ? v.trim() : "";
}
