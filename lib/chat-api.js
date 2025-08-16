export class ChatAPI {
  formatChatHistoryForAPI(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  async sendMessage(message, chatHistory) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        chatHistory: this.formatChatHistoryForAPI(chatHistory)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get AI response');
    }

    return {
      message: data.message,
      usage: data.usage
    };
  }
}