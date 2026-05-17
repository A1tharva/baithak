import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0b141a',
          color: '#e9edef',
          gap: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '48px' }}>😕</span>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Something went wrong</h2>
          <p style={{ 
            margin: 0, 
            fontSize: '13px', 
            color: '#8696a0',
            maxWidth: '300px' 
          }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: '#00a884',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
