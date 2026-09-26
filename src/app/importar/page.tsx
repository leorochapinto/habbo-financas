import { connection } from "next/server";
import { listarCategorias } from "@/lib/lancamentos";
import { ImportarCsv } from "./ImportarCsv";

export default async function Importar() {
  await connection();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar CSV</h1>
        <p className="mt-1 text-sm text-suave">
          Envie o extrato do PicPay (ou qualquer planilha salva em CSV). Primeiro aparece a prévia; nada é gravado até
          você confirmar. Reenviar o mesmo arquivo não duplica lançamentos.
        </p>
      </div>
      <ImportarCsv categorias={{ entrada: listarCategorias("entrada"), saida: listarCategorias("saida") }} />
    </div>
  );
}
