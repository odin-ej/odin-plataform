import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Registrando os elementos necessários do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);


// --- Componente para a Barra de Progresso Circular (Aprimorado com Chart.js) ---
interface CircularProgressProps {
  progress: number; // 0 a 100
  valueText: string;
}

const CircularProgress = ({ progress, valueText }: CircularProgressProps) => {
  // Configuração dos dados para o gráfico de rosca
 const clampedProgress = Math.min(progress, 100);

  // Configuração dos dados para o gráfico de rosca
  const data = {
    datasets: [
      {
        // Usa o valor corrigido para o gráfico, mas o texto continua a mostrar o progresso real.
        data: [clampedProgress, 100 - clampedProgress], // O valor e o que falta para 100%
        backgroundColor: [
          '#0126fb', // Cor do progresso
          '#00205e', // Cor do fundo do progresso
        ],
        borderColor: [
            '#0126fb',
            '#00205e',
        ],
        borderWidth: 1,
        circumference: 360,
        cutout: '80%', // Controla a espessura do anel
      },
    ],
  };

  // Opções para customizar a aparência e comportamento do gráfico
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 500, // Animação suave
    },
    plugins: {
      legend: {
        display: false, // Esconde a legenda
      },
      tooltip: {
        enabled: false, // Desabilita tooltips ao passar o mouse
      },
    },
  };

  return (
    <div className="relative h-40 w-40 flex-shrink-0">
      {/* O container do gráfico */}
      <Doughnut data={data} options={options} />
      {/* O texto sobreposto */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold text-white">{progress}%</span>
        <span className="text-[10px] font-light text-gray-300 break-all px-2 mt-1">{valueText}</span>
      </div>
    </div>
  );
};

export default CircularProgress;