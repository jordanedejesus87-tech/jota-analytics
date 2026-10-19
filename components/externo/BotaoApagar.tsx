'use client'

export default function BotaoApagar() {
  return (
    <button
      type="submit"
      onClick={(e) => { if (!window.confirm('Apagar esta ficha? Não dá para desfazer.')) e.preventDefault() }}
      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
    >
      Apagar esta ficha
    </button>
  )
}
