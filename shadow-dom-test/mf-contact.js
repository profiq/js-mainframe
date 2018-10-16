// Wrap shadow roots in a closure--we want each component to have
// access to its own `shadowRoot`, but prevent access from outside
// of the component.
const shadowRoots = new WeakMap();

// Wrap shadow elements in a closure as well
const shadowElements = new WeakMap();

// Security Note:
// --------------
// The following methods normally provide access to the shadow root,
// and may need extra scrutiny/protection against reassignment:
// - Element.prototype.shadowRoot
// - HTMLElement.assignedSlot
// - Event.composedPath

class MainframeContactComponent extends HTMLElement {

  constructor() {
    super()
    // Create a shadow root
    var shadow = this.attachShadow({mode: 'closed'});

    // Store the shadow root in closure WeakMap
    shadowRoots.set(this, shadow);

    // Initialize an object that will store notable shadow DOM elements
    // in a closure WeakMap
    shadowElements.set(this, {})

    const createElements = () => {
      var shadow = shadowRoots.get(this);
      var elements = shadowElements.get(this);
  
      elements.wrapper = document.createElement('span');
      elements.wrapper.setAttribute('class', 'wrapper');
  
      elements.icon = document.createElement('span');
      elements.icon.setAttribute('class', 'icon');
      elements.icon.setAttribute('tabindex', 0);
      
      elements.info = document.createElement('span');
      elements.info.setAttribute('class', 'info');
  
      elements.image = document.createElement('img');
      elements.image.setAttribute('width', 48);
      elements.image.src = 'profile.png';
  
      elements.style = document.createElement('style');
  
      elements.style.textContent = '.wrapper {' +
        'background-color: white;' + // #00A7E7
        'padding-left: 5px;' +
      '} ' +
      '.info {' +
        'padding-left: 15px; padding-right: 15px;' +
      '} '
  
      shadow.appendChild(elements.style);
      shadow.appendChild(elements.wrapper);
      elements.wrapper.appendChild(elements.icon);
      elements.wrapper.appendChild(elements.info);
      elements.icon.appendChild(elements.image);
    }
  
    createElements();
  }

  connectedCallback() {
    var elements = shadowElements.get(this);

    var name;
    if (this.hasAttribute('ident')) {
      var ident = this.getAttribute('ident');
      if (ident === '63013e4f21adba8') {
        name = "Carl Youngblood"
      } else if (ident === 'ba343f1bd8aa5a0') {
        name = "Paul LeCam"
      } else if (ident === '35a0299d821f4fb') {
        name = "Adam Clarke"
      } else if (ident === 'f1eb9ae84241e05') {
        name = "Duane Johnson"
      } else {
        name = "Unknown User"
        elements.style.textContent += ".info { color: orange; } ";
      }
    } else {
      name = "Choose Contact";
      elements.style.textContent += ".info { color: red; } ";
      elements.style.textContent += ".wrapper { border: 2px solid red;" +
        " border-radius: 5px; cursor: pointer; } ";

      var chooseContact = () => {
        if (confirm("Select 'Duane' as the user?")) {
          elements.info.textContent = "Duane Johnson";
          elements.style.textContent += ".info { color: black; } ";
          elements.style.textContent += ".wrapper { border: 0px; " +
            "cursor: pointer; } ";
        }
      };

      elements.wrapper.addEventListener("click", chooseContact);
    }
    elements.info.textContent = name;
  }
}
customElements.define('mf-contact', MainframeContactComponent)


