import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import figure from '../../Components/assets/figure-home.svg';

const LoadingPage = () => {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Recebe via state a promessa (ou sinal) de que o backend terminou
  // Vamos apenas animar a barra enquanto esperamos um sinal de término
  const done = location.state?.done === true;

  // Polling para detectar término via backend (GET /dados-analise)
  useEffect(() => {
    if (done) return; // Se já vier sinalizado como concluído, não precisa poll

    let cancelled = false;
    const start = Date.now();
    const timeoutMs = 120000; // 2 minutos de tolerância

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await fetch('http://localhost:5000/dados-analise');
        if (res.ok) {
          // Concluiu no backend
          setProgress(100);
          navigate('/relatorios');
          return;
        }
      } catch (e) {
        // Ignora erros de rede e continua tentando
      }

      if (Date.now() - start >= timeoutMs) {
        // Fallback: finaliza mesmo assim para não travar usuário
        setProgress(100);
        navigate('/relatorios');
        return;
      }

      setTimeout(poll, 1500);
    };

    poll();
    return () => { cancelled = true; };
  }, [done, navigate]);

  useEffect(() => {
    // Animação progressiva: acelera no início, desacelera depois.
    // Mantém no máx. 97% até receber done=true.
    if (done) return; // Quando done=true, outro efeito cuida de finalizar.
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 97) return prev; // não finalize sem done
        const step = prev < 30 ? 2 : prev < 60 ? 1 : 0.5;
        const next = prev + step;
        return next > 97 ? 97 : next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [done]);

  useEffect(() => {
    // Ao receber done=true, completa imediatamente e navega
    if (done) {
      setProgress(100);
      const t = setTimeout(() => navigate('/relatorios'), 400);
      return () => clearTimeout(t);
    }
  }, [done, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.illustration}>
          <img
            src={figure}
            alt="Illustration"
            style={styles.image}
          />
        </div>
        <div style={styles.progressBarContainer}>
          <div style={styles.progressBarBackground}>
            <div
              style={{
                ...styles.progressBar,
                width: `${progress}%`,
              }}
            ></div>
          </div>
          <p style={styles.progressText}>{progress}%</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '1rem',
  },
  content: {
    textAlign: 'center',
  },
  illustration: {
    marginBottom: '20px',
  },
  image: {
    width: '350px',
    height: '350px',
  },
  progressBarContainer: {
    marginTop: '20px',
  },
  progressBarBackground: {
    width: '100%',
    height: '10px',
    backgroundColor: '#e0e0e0',
    borderRadius: '5px',
    marginBottom: '10px',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffb74d',
    borderRadius: '5px',
    transition: 'width 0.15s ease-in-out',
  },
  progressText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
};

export default LoadingPage;