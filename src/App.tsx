// src/App.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './supabaseClient';
import Header from './components/Header';
import './App.css';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role, active')
          .eq('id', session.user.id)
          .single();

        if (error || !userData) {
          console.error('Erro ao buscar dados do usuário:', error);
          toast.error('Erro ao validar usuário.');
          await supabase.auth.signOut();
          return;
        }

        if (!userData.active) {
          toast.error('Seu acesso foi desativado.');
          await supabase.auth.signOut();
          return;
        }

        setIsLoggedIn(true);
        const role = userData.role;

        if (role === 'admin' || role === 'employee') {
          navigate('/admin');
        } else if (role === 'client') {
          navigate('/dashboard');
        }
      } else {
        setIsLoggedIn(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkUser();
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="app-container">
      <Header showLogout={isLoggedIn} />
      <div className="auth-container">
        <h1>Portal de Documentos</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]} // login com Google removido
          appearance={{ theme: ThemeSupa }}
          showLinks={false}
          localization={{
            variables: {
              sign_in: { email_label: 'E-mail', password_label: 'Senha', button_label: 'Entrar' },
            },
          }}
        />
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
