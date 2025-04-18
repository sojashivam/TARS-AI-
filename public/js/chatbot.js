document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const uploadArea = document.getElementById('uploadArea');
    const chatInterface = document.getElementById('chatInterface');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Store uploaded file and document ID
    let uploadedFile = null;
    let documentId = null;
    
    // Mistral AI API key - IMPORTANT: In a production environment, this should be handled by your backend
    const MISTRAL_API_ENDPOINT = 'https://api.mistral.ai/v1';
    
    // Handle file upload
    fileInput.addEventListener('change', function(e) {
      if (this.files && this.files[0]) {
        uploadedFile = this.files[0];
        fileName.textContent = `Selected file: ${uploadedFile.name}`;
        
        // Show processing message
        const processingMsg = document.createElement('p');
        processingMsg.textContent = 'Processing document...';
        processingMsg.id = 'processingMsg';
        processingMsg.style.color = '#3498db';
        processingMsg.style.fontWeight = '500';
        uploadArea.appendChild(processingMsg);
        
        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append('file', uploadedFile);
        
        // Process the document with Mistral AI
        processDocument(formData);
      }
    });
    
    // Function to process the document with Mistral AI
    function processDocument(formData) {
      // In a production app, you would send this to your backend which would handle the Mistral AI API call
      // For demonstration purposes, we're showing a direct API call (not recommended for production)
      fetch('/api/process-document', {
        method: 'POST',
        body: formData
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error processing document');
        }
        return response.json();
      })
      .then(data => {
        // Store the document ID for future queries
        documentId = data.documentId;
        
        // Remove processing message
        document.getElementById('processingMsg').remove();
        
        // Show success message
        const successMsg = document.createElement('p');
        successMsg.textContent = 'Document processed successfully!';
        successMsg.style.color = '#27ae60';
        successMsg.style.fontWeight = '500';
        uploadArea.appendChild(successMsg);
        
        // Show chat interface after a short delay
        setTimeout(function() {
          uploadArea.style.display = 'none';
          chatInterface.style.display = 'flex';
          
          // Add welcome message
          addMessage('Hello! I\'ve processed your document. What would you like to know about it?', 'bot');
        }, 1000);
      })
      .catch(error => {
        // Handle error
        console.error('Error:', error);
        document.getElementById('processingMsg').remove();
        
        const errorMsg = document.createElement('p');
        errorMsg.textContent = 'Error processing document. Please try again.';
        errorMsg.style.color = '#e74c3c';
        errorMsg.style.fontWeight = '500';
        uploadArea.appendChild(errorMsg);
      });
    }
    
    // Handle sending message
    function sendMessage() {
      const message = chatInput.value.trim();
      if (message === '') return;
      
      // Add user message to chat
      addMessage(message, 'user');
      
      // Clear input
      chatInput.value = '';
      
      // Add loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'loading-message';
      loadingDiv.classList.add('message', 'bot-message');
      loadingDiv.innerHTML = 'Thinking<span class="dot-animation">...</span>';
      chatMessages.appendChild(loadingDiv);
      
      // Scroll to bottom of chat
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
      // Call API to get response
      askQuestion(message);
    }
    
    // Function to ask a question about the document
    function askQuestion(question) {
      // In a production app, you would send this to your backend which would handle the Mistral AI API call
      fetch('/api/ask-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: documentId,
          question: question
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error getting answer');
        }
        return response.json();
      })
      .then(data => {
        // Remove loading indicator
        document.getElementById('loading-message').remove();
        
        // Add AI response to chat
        addMessage(data.answer, 'bot');
      })
      .catch(error => {
        console.error('Error:', error);
        
        // Remove loading indicator
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) {
          loadingMsg.remove();
        }
        
        // Show error message
        addMessage('Sorry, I encountered an error while processing your question. Please try again.', 'bot');
      });
    }
    
    // Add a message to the chat
    function addMessage(text, sender) {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message');
      messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
      messageDiv.textContent = text;
      
      chatMessages.appendChild(messageDiv);
      
      // Scroll to bottom of chat
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Additional functionality: Allow drag and drop for file upload
    const dropArea = document.getElementById('uploadArea');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
      dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
      dropArea.classList.remove('highlight');
    }
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files && files.length > 0) {
        fileInput.files = files;
        // Trigger the change event manually
        const event = new Event('change');
        fileInput.dispatchEvent(event);
      }
    }
    
    // Add this CSS dynamically for the drag and drop highlight effect and dot animation
    const style = document.createElement('style');
    style.textContent = `
      .upload-area.highlight {
        border-color: #3498db;
        background-color: rgba(52, 152, 219, 0.1);
      }
      
      .dot-animation {
        display: inline-block;
        animation: dots 1.5s infinite;
      }
      
      @keyframes dots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60%, 100% { content: '...'; }
      }
    `;
    document.head.appendChild(style);
    
    // Function to handle file reset/upload new document
    function addResetButton() {
      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Upload New Document';
      resetBtn.className = 'upload-btn';
      resetBtn.style.padding = '12px 24px';
resetBtn.style.fontSize = '16px';
resetBtn.style.fontWeight = 'bold';
resetBtn.style.color = '#fff';
resetBtn.style.backgroundColor = '#4CAF50'; // green
resetBtn.style.border = 'none';
resetBtn.style.borderRadius = '8px';
resetBtn.style.cursor = 'pointer';
resetBtn.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
resetBtn.style.transition = 'background-color 0.3s ease, transform 0.2s ease';
resetBtn.style.margin = '20px';
      resetBtn.addEventListener('click', function() {
        // Clear chat history
        chatMessages.innerHTML = '';
        
        // Show upload area again
        chatInterface.style.display = 'none';
        uploadArea.style.display = 'block';
        
        // Clear previous upload info
        fileName.textContent = '';
        
        // Remove any previous success or processing messages
        const msgs = uploadArea.querySelectorAll('p:not(#fileName)');
        msgs.forEach(msg => msg.remove());
        
        // Reset file input
        fileInput.value = '';
        uploadedFile = null;
        documentId = null;
      });
      
      // Add reset button to chat interface
      chatInterface.appendChild(resetBtn);
    }
    
    // Call this function to add the reset button
    addResetButton();
  });