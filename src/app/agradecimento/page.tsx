'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PaymentSuccessAnimation } from '@/components/payment/PaymentSuccessAnimation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, ExternalLink, FileSearch } from 'lucide-react';

export default function AgradecimentoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Obter parâmetros da URL
    const id = searchParams.get('id');
    const emailParam = searchParams.get('email');
    
    if (id) setTransactionId(id);
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      <main className="container mx-auto py-12 px-4 max-w-3xl">
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-green-600">
              Pedido Recebido!
            </CardTitle>
            <CardDescription className="text-lg">
              Agradecemos pela sua compra
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col items-center">
            <PaymentSuccessAnimation autoRedirect={false} />
            
            <div className="mt-8 text-center space-y-4">
              <p className="text-gray-700">
                Seu pedido foi recebido e está sendo processado. Você receberá atualizações sobre o status do seu pedido.
              </p>
              
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span>Pagamento confirmado</span>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <h3 className="font-medium text-gray-800 mb-2">Próximos passos:</h3>
                <ul className="text-left text-gray-600 space-y-2">
                  <li>1. Seu pedido está sendo enviado para processamento</li>
                  <li>2. O engajamento será entregue em até 24 horas</li>
                  <li>3. Você pode acompanhar o status do seu pedido a qualquer momento</li>
                </ul>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para a página inicial
              </Link>
            </Button>
            
            <Button asChild>
              <Link href="/acompanhar-pedido" className="flex items-center gap-2">
                <FileSearch className="w-4 h-4" />
                Acompanhar meu pedido
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
