import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from './App';

// Mock the API client
vi.mock('./api', () => ({
  apiRequest: vi.fn((endpoint) => {
    if (endpoint === '/classes') {
      return Promise.resolve([
        {
          id: 'c_123',
          name: 'Class 6 - Morning Shift',
          totalSeats: 120,
          heldSeats: 15,
          confirmedSeats: 80,
          availableSeats: 25
        }
      ]);
    }
    if (endpoint === '/me/holds') {
      return Promise.resolve([]);
    }
    return Promise.resolve({});
  })
}));

describe('School Admission Frontend Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Test 1: Student ID 17-digit input and localStorage persistence
  it('should accept 17-digit student birth registration ID and persist to localStorage', async () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/যেমন: 20152691234567890/i);
    
    // Type 17-digit number
    fireEvent.change(input, { target: { value: '20152691234567890' } });

    expect(input.value).toBe('20152691234567890');
    expect(localStorage.getItem('school_student_id')).toBe('20152691234567890');
  });

  // Test 2: Renders class list with correct seat metrics
  it('should render class list and seat statistics from backend', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Class 6 - Morning Shift')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument(); // total
      expect(screen.getByText('25')).toBeInTheDocument();  // available
      expect(screen.getByText(/আবেদন করুন \(Hold Seat\)/i)).toBeInTheDocument();
    });
  });

  // Test 3: Tab navigation works correctly (targeting the button specifically)
  it('should switch tabs between Class list, My holds, and Admin creation', async () => {
    render(<App />);
    
    // Target button role specifically to avoid matching the text in empty state div
    const adminTab = screen.getByRole('button', { name: /নতুন ক্লাস তৈরি \(Admin\)/i });
    fireEvent.click(adminTab);

    expect(screen.getByText(/নতুন ক্লাস এবং শিফট যুক্ত করুন/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/যেমন: Class 6 - Morning Shift/i)).toBeInTheDocument();
  });
});