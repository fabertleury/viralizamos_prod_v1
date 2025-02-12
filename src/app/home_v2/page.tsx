'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';

export default function HomeV2() {
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário está logado através de cookies
    const token = document.cookie.match('(^|;)\\s*session\\s*=\\s*([^;]+)')?.pop();
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    // Carregar e inicializar particles.js
    const loadParticles = async () => {
      if (typeof window !== 'undefined') {
        const particlesJS = (window as any).particlesJS;
        if (particlesJS) {
          particlesJS('particles-js', {
            particles: {
              number: {
                value: 80,
                density: {
                  enable: true,
                  value_area: 800
                }
              },
              color: {
                value: '#ffffff'
              },
              shape: {
                type: 'circle'
              },
              opacity: {
                value: 0.5,
                random: false
              },
              size: {
                value: 3,
                random: true
              },
              line_linked: {
                enable: true,
                distance: 150,
                color: '#ffffff',
                opacity: 0.4,
                width: 1
              },
              move: {
                enable: true,
                speed: 6,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false
              }
            },
            interactivity: {
              detect_on: 'canvas',
              events: {
                onhover: {
                  enable: true,
                  mode: 'repulse'
                },
                onclick: {
                  enable: true,
                  mode: 'push'
                },
                resize: true
              }
            },
            retina_detect: true
          });
        }
      }
    };

    loadParticles();
  }, []);

  return (
    <main>
      <div id="particles-js"></div>
      
      {/* Banner Section */}
      <section className="banner" id="home">
        <div className="container">
          <div className="row">
            <div className="col-md-8 mx-auto">
              <div className="content">
                <h1 className="m-b-50 m-t-50">
                  Torne-me seu perfil no Instagram um sucesso!
                </h1>
                <div className="desc">
                  Economize tempo gerenciando sua conta social em um só lugar. Nosso serviço ajuda você a construir seu negócio, fazer seu conteúdo de mídia social circular pelo mundo e se tornar famoso.
                </div>
                <div className="head-button m-t-40">
                  <Link href="/services" className="btn btn-pill btn-outline-primary sign-up btn-lg">
                    Ver Planos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section-2 text-center" id="features">
        <div className="container">
          <div className="row">
            <div className="col-md-12 mx-auto">
              <div className="content">
                <div className="title">
                  Preços básicos e sob medida
                </div>
                <div className="border-line">
                  <hr/>
                </div>
              </div>
            </div>
            
            {/* Instagram */}
            <div className="col-md-4">
              <div className="service-card instagram">
                <h3>Instagram</h3>
                <div className="service-items">
                  <div className="item">
                    <span>1.000 Seguidores</span>
                    <span>R$ 29,90</span>
                  </div>
                  <div className="item">
                    <span>5.000 Seguidores</span>
                    <span>R$ 89,90</span>
                  </div>
                  <div className="item">
                    <span>10.000 Seguidores</span>
                    <span>R$ 149,90</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TikTok */}
            <div className="col-md-4">
              <div className="service-card tiktok">
                <h3>TikTok</h3>
                <div className="service-items">
                  <div className="item">
                    <span>1.000 Seguidores</span>
                    <span>R$ 29,90</span>
                  </div>
                  <div className="item">
                    <span>5.000 Seguidores</span>
                    <span>R$ 89,90</span>
                  </div>
                  <div className="item">
                    <span>10.000 Seguidores</span>
                    <span>R$ 149,90</span>
                  </div>
                </div>
              </div>
            </div>

            {/* YouTube */}
            <div className="col-md-4">
              <div className="service-card youtube">
                <h3>YouTube</h3>
                <div className="service-items">
                  <div className="item">
                    <span>1.000 Inscritos</span>
                    <span>R$ 29,90</span>
                  </div>
                  <div className="item">
                    <span>5.000 Inscritos</span>
                    <span>R$ 89,90</span>
                  </div>
                  <div className="item">
                    <span>10.000 Inscritos</span>
                    <span>R$ 149,90</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works text-center">
        <div className="container">
          <div className="row">
            <div className="col-md-12 mx-auto">
              <div className="header-top">
                <div className="title">
                  Como comprar um pacote
                </div>
                <span>Comprar pacotes de mídia social em nossos serviços é simples e rápido. Basta seguir estes passos:</span>
              </div>
              <div className="col-md-12">
                <div className="row step-lists">
                  <div className="col-sm-6 col-lg-4 step text-left">
                    <div className="header-name">
                      <h3>Escolha o pacote</h3>
                      <p className="desc">É fácil começar conosco. Escolha entre nossa ampla gama de pacotes que atendem às suas necessidades.</p>
                    </div>
                    <div className="bg-number">1</div>
                  </div>

                  <div className="col-sm-6 col-lg-4 step text-left">
                    <div className="header-name">
                      <h3>Insira os detalhes</h3>
                      <p className="desc">Forneça-nos detalhes sobre o que você precisa impulsionar agora. Não exigimos sua senha.</p>
                    </div>
                    <div className="bg-number">2</div>
                  </div>

                  <div className="col-sm-6 col-lg-4 step text-left">
                    <div className="header-name">
                      <h3>Aguarde os resultados</h3>
                      <p className="desc">Você pode pagar via cartão ou qualquer outro método disponível. Criaremos e prosseguiremos com o pedido e informaremos quando estiver concluído.</p>
                    </div>
                    <div className="bg-number">3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq text-center">
        <div className="container">
          <div className="row">
            <div className="col-md-12 mx-auto">
              <div className="header-top">
                <div className="title">
                  Perguntas Frequentes
                </div>
              </div>
              <div className="faq-items">
                <div className="faq-item">
                  <h3>Como funciona o serviço?</h3>
                  <p>Nosso serviço é 100% automático. Após a confirmação do pagamento, os seguidores começam a chegar em sua conta em até 24 horas.</p>
                </div>
                <div className="faq-item">
                  <h3>É seguro?</h3>
                  <p>Sim, é totalmente seguro. Não pedimos sua senha e usamos apenas métodos aprovados pelas plataformas.</p>
                </div>
                <div className="faq-item">
                  <h3>Quanto tempo demora?</h3>
                  <p>O processo começa em até 24 horas após a confirmação do pagamento e pode levar até 7 dias para ser concluído.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js" />
    </main>
  );
}
