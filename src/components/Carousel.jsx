import { useState, useEffect } from "react";
import "./Carousel.css";

const images = [
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/7md2e1pjffr3/b2_(1).png",
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/kxdomfx0utww/b6.png",
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/ji9d96g9hl23/Sin-ti%CC%81tulo-1.png",
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/yuxozsd9j6lc/b3.png",
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/h0apnbvftllq/b12.png",
  "https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/alianza-b7y88v/assets/7avj616eg997/b7.png",
];

export default function Carousel() {
  const [current, setCurrent] = useState(0);

  // Avanza automático cada 4 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((current - 1 + images.length) % images.length);
  const next = () => setCurrent((current + 1) % images.length);

  return (
    <div className="carousel">

      {/* Imagen */}
      <div className="carousel-track">
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={`Banner ${i + 1}`}
            className={`carousel-img ${i === current ? "active" : ""}`}
          />
        ))}
      </div>

      {/* Flecha izquierda */}
      <button className="carousel-btn carousel-btn-left" onClick={prev}>
        ‹
      </button>

      {/* Flecha derecha */}
      <button className="carousel-btn carousel-btn-right" onClick={next}>
        ›
      </button>

      {/* Puntos */}
      <div className="carousel-dots">
        {images.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot ${i === current ? "active" : ""}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>

    </div>
  );
}