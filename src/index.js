import './style.css';

function component() {
  var element = document.createElement('div');

  element.innerHTML = "Hello webpack!"
  element.classList.add("hello");

  return element;
}

let element = component();
document.body.appendChild(element);
