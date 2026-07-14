import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class LazyLoadBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className={`coach-lazy-load-error ${this.props.variant === 'modal' ? 'is-modal' : ''}`} role="alert">
        <AlertTriangle size={22} />
        <div>
          <h3>화면을 불러오지 못했습니다.</h3>
          <p>네트워크 연결을 확인한 뒤 다시 불러와 주세요.</p>
        </div>
        <button type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={15} />
          다시 불러오기
        </button>
      </div>
    );
  }
}
