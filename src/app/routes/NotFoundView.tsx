// src/app/routes/NotFoundView.tsx
import React from "react";
import { Link } from "react-router-dom";

export const NotFoundView: React.FC = () => {
  return (
    <section className="na-not-found-view">
      <h1 className="na-not-found-view__title">Page not found</h1>
      <p className="na-not-found-view__description">
        The page you are looking for does not exist.
      </p>
      <Link className="na-link" to="/">
        Go back to the map
      </Link>
    </section>
  );
};
