import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import BrowserFrame from '../components/BrowserFrame';
import dashboardShot from '../assets/screenshots/dashboard.png';
import employeesShot from '../assets/screenshots/employees.png';
import payrollShot from '../assets/screenshots/payroll.png';
import leaveShot from '../assets/screenshots/leave.png';
import documentsShot from '../assets/screenshots/documents.png';

const SHOWCASE = [
  {
    index: '01',
    title: 'Colaboradores, sem planilha',
    description:
      'Cadastre cada colaborador uma vez — dados, cargo, salário e histórico ficam num só lugar, acessíveis para quem precisa, sem arquivo desatualizado circulando por e-mail.',
    bullets: ['Busca e edição em segundos', 'Histórico de admissão sempre à mão'],
    image: employeesShot,
    url: 'app.rhsaas.com.br/colaboradores',
  },
  {
    index: '02',
    title: 'Folha de pagamento sem susto',
    description:
      'Abra a folha do mês, acompanhe o status e feche com confiança. Sem planilha paralela para conferir se bateu.',
    bullets: ['Um painel por competência', 'Status claro: rascunho, aberta, aprovada'],
    image: payrollShot,
    url: 'app.rhsaas.com.br/folha',
  },
  {
    index: '03',
    title: 'Férias que não dependem de memória',
    description:
      'Colaborador solicita, gestor aprova ou rejeita com um clique. O saldo de dias é calculado automaticamente — ninguém tira férias a mais por engano.',
    bullets: ['Aprovação com um clique', 'Saldo sempre atualizado'],
    image: leaveShot,
    url: 'app.rhsaas.com.br/ferias',
  },
  {
    index: '04',
    title: 'Documentos que avisam antes de vencer',
    description:
      'ASO, contratos, certificados — cada um com data de vencimento. Você é avisado com antecedência, não no dia em que já é tarde.',
    bullets: ['Alerta automático de vencimento', 'Um histórico por colaborador'],
    image: documentsShot,
    url: 'app.rhsaas.com.br/documentos',
  },
];

const COMPARISON = [
  { old: 'Dados de colaboradores espalhados em planilhas e pastas', new: 'Tudo centralizado, num único sistema' },
  { old: 'Saldo de férias anotado à mão, sujeito a erro', new: 'Calculado automaticamente a cada solicitação' },
  { old: 'Documento vencido descoberto tarde demais', new: 'Alerta antes do vencimento' },
  { old: 'Headcount real? Só perguntando por aí', new: 'Um número, sempre certo, no dashboard' },
];

const FAQS = [
  {
    q: 'Preciso migrar os dados manualmente?',
    a: 'Você cadastra os colaboradores diretamente na plataforma. O processo foi desenhado para ser rápido mesmo para quem está saindo de planilhas.',
  },
  {
    q: 'Serve para empresas de qualquer tamanho?',
    a: 'O RH SaaS foi construído pensando em pequenas e médias empresas — sem a complexidade (e o preço) dos sistemas de RH corporativos.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, não há contrato de fidelidade. Você mantém acesso aos seus dados para exportação a qualquer momento.',
  },
  {
    q: 'Quanto tempo leva para configurar?',
    a: 'Leva minutos: crie sua conta, cadastre a empresa e comece a adicionar colaboradores.',
  },
];

const AVATARS = [
  { initials: 'AB', color: 'bg-blue-100 text-blue-700' },
  { initials: 'RS', color: 'bg-amber-100 text-amber-700' },
  { initials: 'CF', color: 'bg-emerald-100 text-emerald-700' },
];

function Logo({ variant = 'dark' }) {
  const tone = variant === 'light' ? 'text-cream' : 'text-ink';
  return (
    <span className={`font-display italic text-2xl tracking-tight ${tone}`}>
      RH<span className="text-accent not-italic">.</span>saas
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream text-ink font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-cream/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-18 py-4 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-ink/70">
            <a href="#vitrine" className="hover:text-ink transition">Funcionalidades</a>
            <a href="#comparacao" className="hover:text-ink transition">Por que migrar</a>
            <a href="#faq" className="hover:text-ink transition">Perguntas frequentes</a>
          </nav>
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate('/login')}
              className="hidden sm:inline text-sm text-ink/70 hover:text-ink transition"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate('/login')}
              className="bg-ink hover:bg-black text-cream text-sm font-medium px-5 py-2.5 rounded-full transition"
            >
              Começar agora
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(rgba(21,22,30,0.08) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-28 md:pt-24 md:pb-36 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-7">
              <span className="w-8 h-px bg-accent" />
              <span className="uppercase text-xs tracking-[0.2em] text-ink/50 font-medium">
                Feito para PMEs brasileiras
              </span>
            </div>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] mb-7">
              O RH da sua empresa,
              <br />
              <span className="italic text-accent">fora das planilhas.</span>
            </h1>
            <p className="text-lg text-ink/60 mb-9 max-w-md">
              Colaboradores, folha, férias e documentos — tudo num só lugar,
              com alertas antes que vire problema.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
              <button
                onClick={() => navigate('/login')}
                className="bg-ink hover:bg-black text-cream font-medium px-7 py-3.5 rounded-full flex items-center justify-center gap-2 transition"
              >
                Começar agora
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#vitrine"
                className="group text-sm font-medium text-ink/70 hover:text-ink flex items-center justify-center gap-1.5 transition"
              >
                Ver como funciona
                <ArrowUpRight className="w-4 h-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
            <p className="text-sm text-ink/40">
              Sem cartão de crédito · Configuração em poucos minutos
            </p>
          </div>

          <div className="relative">
            <BrowserFrame
              src={dashboardShot}
              alt="Dashboard do RH SaaS mostrando headcount, folhas abertas, férias pendentes e documentos vencendo"
              url="app.rhsaas.com.br/dashboard"
              className="rotate-1"
            />
            <div className="hidden sm:flex absolute -bottom-7 -left-7 bg-white rounded-xl shadow-xl border border-black/5 px-4 py-3 items-center gap-3 -rotate-2">
              <div className="flex -space-x-2">
                {AVATARS.map((a) => (
                  <div
                    key={a.initials}
                    className={`w-7 h-7 rounded-full ring-2 ring-white text-[10px] font-semibold flex items-center justify-center ${a.color}`}
                  >
                    {a.initials}
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium text-ink/70">6 colaboradores ativos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature showcase */}
      <section id="vitrine" className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-xl mb-20">
          <p className="uppercase text-xs tracking-[0.2em] text-accent font-medium mb-4">Funcionalidades</p>
          <h2 className="font-display text-3xl md:text-4xl leading-tight">
            Quatro rotinas de RH, <span className="italic">resolvidas.</span>
          </h2>
        </div>

        <div className="space-y-24 md:space-y-32">
          {SHOWCASE.map((item, i) => (
            <div
              key={item.title}
              className={`grid md:grid-cols-2 gap-10 md:gap-16 items-center ${
                i % 2 === 1 ? 'md:[direction:rtl]' : ''
              }`}
            >
              <div style={{ direction: 'ltr' }}>
                <BrowserFrame src={item.image} alt={item.title} url={item.url} />
              </div>
              <div style={{ direction: 'ltr' }}>
                <span className="font-display italic text-accent text-2xl block mb-4">
                  {item.index}
                </span>
                <h3 className="font-display text-2xl md:text-3xl mb-4">{item.title}</h3>
                <p className="text-ink/60 mb-6 leading-relaxed">{item.description}</p>
                <ul className="space-y-2.5">
                  {item.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-sm text-ink/80">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section id="comparacao" className="bg-ink text-cream">
        <div className="max-w-4xl mx-auto px-6 py-24 md:py-28">
          <div className="max-w-lg mb-14">
            <p className="uppercase text-xs tracking-[0.2em] text-accent font-medium mb-4">Por que migrar</p>
            <h2 className="font-display text-3xl md:text-4xl leading-tight">
              A diferença aparece <span className="italic">na primeira semana.</span>
            </h2>
          </div>

          <div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.old}
                className="border-t border-white/10 py-6 grid gap-2 md:grid-cols-[3rem_1fr_1fr] md:items-baseline md:gap-8"
              >
                <span className="font-display italic text-accent text-lg block">
                  0{i + 1}
                </span>
                <p className="text-cream/40 line-through decoration-cream/20 text-sm md:text-base">
                  {row.old}
                </p>
                <p className="text-cream font-medium text-sm md:text-base">{row.new}</p>
              </div>
            ))}
            <div className="border-t border-white/10" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24 md:py-28">
        <p className="uppercase text-xs tracking-[0.2em] text-accent font-medium mb-4">Perguntas frequentes</p>
        <h2 className="font-display text-3xl md:text-4xl mb-12">Antes de você começar</h2>
        <div className="divide-y divide-black/10">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-6">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-display text-lg md:text-xl">
                {item.q}
                <span className="shrink-0 text-accent text-2xl leading-none font-sans group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="text-ink/60 mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-ink text-cream">
        <div className="max-w-4xl mx-auto px-6 py-24 md:py-28 text-center">
          <h2 className="font-display text-3xl md:text-5xl leading-tight mb-6">
            Tire o RH da sua empresa
            <br />
            <span className="italic text-accent">das planilhas hoje.</span>
          </h2>
          <p className="text-cream/50 mb-10 max-w-md mx-auto">
            Crie sua conta gratuitamente e cadastre o primeiro colaborador em menos de 5 minutos.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-accent hover:bg-accent/90 text-white font-medium px-8 py-3.5 rounded-full inline-flex items-center gap-2 transition"
          >
            Começar agora
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-cream/40 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Logo variant="light" />
          <p>&copy; {new Date().getFullYear()} RH SaaS. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
