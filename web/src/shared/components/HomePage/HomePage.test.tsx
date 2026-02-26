import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders hero title and categories', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Crear torneo|Create tournament/i)).toBeInTheDocument();
    expect(screen.getByText(/Fútbol|Football/i)).toBeInTheDocument();
    expect(screen.getByText(/Fútbol sala|Futsal/i)).toBeInTheDocument();
  });
});
