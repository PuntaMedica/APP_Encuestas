"use client";
import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function GraficaBarras() {
  const [promedios, setPromedios] = useState([]);
  const [numEncuestas, setNumEncuestas] = useState(0);

  useEffect(() => {
    fetch('/api/datos-grafica')
      .then((res) => res.json())
      .then((data) => {
        setPromedios(data.promedios);
        setNumEncuestas(data.num_encuestas);
      })
      .catch((err) => console.error(err));
  }, []);

  const data = {
    labels: promedios.map((item) => item.pregunta),
    datasets: [
      {
        label: 'Promedio de Satisfacción',
        data: promedios.map((item) => item.promedio),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Gráfica de Promedios</h1>
      <p>Total de encuestas: {numEncuestas}</p>
      <Bar data={data} />
      <button style={{ marginTop: '20px' }}>
        <a
          href="/api/descargar-excel"
          style={{ textDecoration: 'none', color: 'inherit' }}
          download
        >
          Descargar Excel
        </a>
      </button>
    </div>
  );
}
