import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskBoard from '../app/page';

describe('TaskBoard Component', () => {
  test('renders TaskBoard component', () => {
    render(<TaskBoard />);
    const titleElement = screen.getByText(/Task Board/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('displays the correct title', () => {
    render(<TaskBoard />);
    const titleElement = screen.getByText(/Task Board/i);
    expect(titleElement).toBeInTheDocument();
  });
});
