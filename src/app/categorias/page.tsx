import { connection } from "next/server";
import { novaCategoria } from "@/app/actions";
import { listarCategorias } from "@/lib/lancamentos";

export default async function Categorias() {
  await connection();
  const entrada = listarCategorias("entrada");
  const saida = listarCategorias("saida");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Categorias</h1>

      <form action={novaCategoria} className="cartao flex flex-wrap items-end gap-3">
        <label className="grow">
          <span className="rotulo">Nome</span>
          <input name="nome" required placeholder="Ex.: Evento de fim de semana" className="campo" />
        </label>
        <label>
          <span className="rotulo">Usada em</span>
          <select name="tipo" className="campo">
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas e perdas</option>
          </select>
        </label>
        <button className="botao">Adicionar</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { titulo: "Entradas", lista: entrada },
          { titulo: "Saídas e perdas", lista: saida },
        ].map((g) => (
          <section key={g.titulo} className="cartao">
            <h2 className="mb-3 font-medium">{g.titulo}</h2>
            <ul className="space-y-1 text-sm">
              {g.lista.map((c) => (
                <li key={c.id}>{c.nome}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
