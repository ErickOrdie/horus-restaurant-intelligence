import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cctv, LayoutGrid, LineChart, ShieldCheck, Timer, Trash2 } from "lucide-react";
import { HorusLogo } from "@/components/horus/HorusLogo";
import { Button } from "@/components/ui/button";
import gestao from "@/assets/landing-gestao.jpg";
import visMesas from "@/assets/vision-2.png.asset.json";
import visPrato from "@/assets/vision-3.png.asset.json";
import visPessoas from "@/assets/vision-4.png.asset.json";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Hórus — AI Restaurant Intelligence" },
      { name: "description", content: "Visão computacional que transforma o salão, o buffet e os pratos em indicadores para a gestão do restaurante." },
      { property: "og:title", content: "Hórus — AI Restaurant Intelligence" },
      { property: "og:description", content: "Filas, mesas, pratos e desperdício medidos por câmeras e IA." },
    ],
  }),
});

const FEATURES = [
  { icon: LayoutGrid, t: "Monitoramento do salão", d: "Ocupação das mesas e giro do almoço em tempo real." },
  { icon: Timer, t: "Filas e atendimento", d: "Tempo de espera no buffet e no caixa, por horário." },
  { icon: Trash2, t: "Desperdício alimentar", d: "Sobras por prato e por alimento, com custo estimado." },
  { icon: Cctv, t: "Câmeras e webcam", d: "Conecte câmeras do restaurante ou a webcam do computador." },
  { icon: LineChart, t: "Indicadores executivos", d: "Painel com comparação de períodos e exportação." },
  { icon: ShieldCheck, t: "Privacidade", d: "Sem reconhecimento facial. Imagens só com consentimento." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <HorusLogo />
          <nav className="flex items-center gap-2">
            <a href="#recursos" className="hidden px-3 text-sm text-muted-foreground hover:text-foreground md:block">Recursos</a>
            <a href="#visao" className="hidden px-3 text-sm text-muted-foreground hover:text-foreground md:block">O que a IA vê</a>
            <a href="#como" className="hidden px-3 text-sm text-muted-foreground hover:text-foreground md:block">Como funciona</a>
            <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold">AI Restaurant Intelligence</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">Inteligência que transforma visão em decisões.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">O Hórus usa as câmeras do restaurante para medir filas, mesas, composição dos pratos e desperdício — e entrega tudo em indicadores claros para a gestão.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/auth">Acessar a plataforma<ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#recursos">Conhecer recursos</a></Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t pt-6">
            {[["32", "mesas monitoradas"], ["24/7", "acompanhamento"], ["0", "reconhecimento facial"]].map(([v, l]) => (
              <div key={l}><dt className="text-2xl font-semibold text-primary">{v}</dt><dd className="mt-1 text-[12px] text-muted-foreground">{l}</dd></div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <img src={visMesas.url} alt="Vista superior do salão com o estado de cada mesa detectado pela IA" width={1125} height={630} className="aspect-[4/3] w-full rounded-xl border object-cover shadow-lg" />
          <div className="absolute -bottom-5 left-5 rounded-lg border bg-card px-4 py-3 shadow-md">
            <p className="text-[11px] uppercase tracking-wider text-subtle">Agora no salão</p>
            <p className="text-lg font-semibold">Mesas, filas e pratos em tempo real</p>
          </div>
        </div>
      </section>

      <section id="visao" className="mx-auto max-w-6xl px-6 py-20">
        <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold">O que a IA vê</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Cada câmera vira um sensor da operação.</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">Exemplos de detecções: estado das mesas, composição dos pratos e contagem de pessoas.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            [visMesas.url, "Estado das mesas", "Comendo, aguardando ou em limpeza — com o tempo de cada mesa."],
            [visPrato.url, "Composição dos pratos", "Pratos, tigelas e alimentos identificados em cada bandeja."],
            [visPessoas.url, "Fluxo de pessoas", "Clientes e equipe contados para medir ocupação e filas."],
          ].map(([src, t, d]) => (
            <figure key={t} className="overflow-hidden rounded-xl border bg-card">
              <img src={src} alt={t} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <figcaption className="p-5"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted-foreground">{d}</p></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Comece em 3 passos</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[["Conecte", "Cadastre as câmeras do salão ou use a webcam do computador."], ["Analise", "A IA detecta mesas, pessoas e pratos a cada imagem."], ["Decida", "Acompanhe indicadores, alertas e relatórios no painel."]].map(([t, d], i) => (
              <li key={t} className="rounded-lg border bg-background p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{t}</h3><p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="recursos" className="border-y bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Tudo o que acontece no restaurante, medido.</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Módulos pensados para restaurantes de buffet, churrascarias e operações de alto giro.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-lg border bg-background p-6 transition-shadow hover:shadow-md">
                <Icon className="size-6 text-gold" />
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como" className="mx-auto max-w-6xl space-y-20 px-6 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <img src={visPrato.url} alt="Prato de buffet com picanha, arroz, feijão e salada" loading="lazy" width={600} height={350} className="w-full rounded-xl border object-cover" />
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold">Inteligência alimentar</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Saiba o que sai do buffet — e o que volta no prato.</h3>
            <p className="mt-3 text-muted-foreground">A IA identifica os alimentos servidos, estima a composição dos pratos e aponta o desperdício por item, para ajustar produção e cardápio.</p>
          </div>
        </div>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="md:order-2"><img src={gestao} alt="Gestor de restaurante consultando indicadores em um tablet" loading="lazy" width={1024} height={1024} className="aspect-square w-full rounded-xl border object-cover" /></div>
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold">Gestão</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Decisões com dados, não com achismo.</h3>
            <p className="mt-3 text-muted-foreground">Painel executivo, alertas operacionais e histórico de detecções para o gestor agir na hora certa — do almoço de hoje ao planejamento do mês.</p>
            <Button asChild className="mt-6"><Link to="/auth">Começar agora<ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Veja seu restaurante com os olhos do Hórus.</h2>
          <Button asChild size="lg" variant="secondary"><Link to="/auth">Acessar a plataforma<ArrowRight /></Link></Button>
        </div>
      </section>

      <footer className="border-t bg-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-subtle md:flex-row">
          <HorusLogo />
          <p>© 2026 Hórus · AI Restaurant Intelligence</p>
        </div>
      </footer>
    </div>
  );
}
