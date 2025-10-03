import React from 'react';

function Timer(props) {
  // Nếu minutes = 15 và có truyền hàm startTimer từ cha
  if (props.minutes === '15' && typeof props.startTimer === 'function') {
    props.startTimer();
  }

  return (
    <div>
      <div className="column is-12 has-text-centered">
        {props.minutes}:{props.seconds}
      </div>
    </div>
  );
}

export default Timer;
