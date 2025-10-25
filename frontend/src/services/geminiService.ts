import { GoogleGenerativeAI } from '@google/generative-ai'

// Khởi tạo Gemini AI
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyD4JXN1jV8VB0jepu2jvnVHQWoe7i3ksho'
const genAI = new GoogleGenerativeAI(API_KEY)

// Model configuration
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  },
})

// System prompt for financial assistant
const SYSTEM_PROMPT = `Bạn là Vissmart AI - trợ lý thông minh đa năng. 
Chuyên môn chính của bạn là quản lý tài chính cá nhân, nhưng bạn cũng có thể:
- Trả lời câu hỏi về nhiều chủ đề khác nhau
- Trò chuyện một cách thân thiện và tự nhiên
- Đưa ra lời khuyên về tài chính, đầu tư, tiết kiệm
- Giúp phân tích chi tiêu và ngân sách
- Trả lời các câu hỏi tổng quát

Hãy trả lời một cách thân thiện, rõ ràng và bằng tiếng Việt. Luôn sẵn sàng giúp đỡ người dùng!`

interface Message {
  role: 'user' | 'model'
  parts: { text: string }[]
}

/**
 * Gửi tin nhắn đến Gemini API và nhận phản hồi
 */
export const sendMessageToGemini = async (
  userMessage: string,
  conversationHistory: Message[] = []
): Promise<string> => {
  try {
    // Kiểm tra API key
    if (!API_KEY) {
      throw new Error('API key chưa được cấu hình. Vui lòng thêm VITE_GEMINI_API_KEY vào file .env')
    }

    // Tạo prompt với lịch sử hội thoại
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Xin chào! Tôi là Vissmart AI, trợ lý tài chính của bạn. Tôi sẵn sàng giúp bạn quản lý tài chính cá nhân hiệu quả hơn.' }] },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          parts: msg.parts
        })),
      ],
    })

    // Gửi tin nhắn
    const result = await chat.sendMessage(userMessage)
    const response = await result.response
    const text = response.text()

    return text
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    
    // Fallback message nếu có lỗi
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return '⚠️ Vui lòng cấu hình API key của Gemini trong file .env'
      }
      if (error.message.includes('429')) {
        return '⚠️ Quá nhiều yêu cầu. Vui lòng thử lại sau vài giây.'
      }
      if (error.message.includes('network')) {
        return '⚠️ Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.'
      }
    }
    
    return '⚠️ Xin lỗi, có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.'
  }
}

/**
 * Lấy phản hồi nhanh từ Gemini với prompt đơn giản
 */
export const getQuickResponse = async (userMessage: string): Promise<string> => {
  try {
    console.log('🔵 ===== START API CALL =====')
    console.log('🔵 API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'Not found')
    console.log('🔵 User message:', userMessage)
    
    if (!API_KEY) {
      console.log('⚠️ No API key, using mock response')
      return getMockResponse(userMessage)
    }

    const prompt = `${SYSTEM_PROMPT}\n\nNgười dùng hỏi: "${userMessage}"\n\nHãy trả lời một cách tự nhiên và chi tiết theo câu hỏi của người dùng:`
    
    console.log('🔄 Calling Gemini API...')
    console.log('🔄 Model:', model)
    
    const result = await model.generateContent(prompt)
    console.log('📦 Raw result:', result)
    
    const response = await result.response
    console.log('📦 Response object:', response)
    
    // Kiểm tra các cách lấy text
    const text = response.text()
    console.log('📝 Text method result:', text)
    console.log('📝 Text type:', typeof text)
    
    // Nếu text rỗng, thử lấy từ candidates
    if (!text || text.length === 0) {
      console.log('⚠️ Text is empty, trying candidates...')
      const candidates = response.candidates
      console.log('📋 Candidates:', candidates)
      
      if (candidates && candidates.length > 0) {
        const candidate = candidates[0]
        console.log('📋 First candidate:', candidate)
        
        if (candidate.content && candidate.content.parts) {
          const parts = candidate.content.parts
          console.log('📋 Parts:', parts)
          
          const partText = parts.map((part: any) => part.text).filter(Boolean).join('')
          console.log('📝 Extracted text from parts:', partText)
          
          if (partText) {
            console.log('✅ Using text from parts')
            console.log('🔵 ===== END API CALL =====')
            return partText
          }
        }
      }
    }
    
    console.log('✅ Gemini response received!')
    console.log('✅ Response text:', text)
    console.log('🔵 ===== END API CALL =====')
    return text || '⚠️ Không nhận được phản hồi từ AI'
  } catch (error) {
    console.error('❌ ===== ERROR START =====')
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message)
      console.error('❌ Error stack:', error.stack)
      console.error('❌ Error name:', error.name)
    }
    console.error('❌ ===== ERROR END =====')
    
    // Trả về lỗi chi tiết
    if (error instanceof Error) {
      return `⚠️ Lỗi: ${error.message}.\nVui lòng kiểm tra console để biết thêm chi tiết.`
    }
    return '⚠️ Có lỗi xảy ra khi kết nối với AI.'
  }
}

/**
 * Mock responses khi chưa có API key hoặc có lỗi
 */
const getMockResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase()
  
  if (lowerMessage.includes('chi tiêu') || lowerMessage.includes('chi')) {
    return 'Dựa trên dữ liệu của bạn, tháng này bạn đã chi tiêu 9.909.000 VNĐ. Các hạng mục chi nhiều nhất là: Ăn uống (2.345.000 VNĐ), Sinh hoạt (3.124.000 VNĐ). Bạn có muốn xem chi tiết hơn không?'
  }
  
  if (lowerMessage.includes('tiết kiệm') || lowerMessage.includes('tiết')) {
    return 'Để tiết kiệm hiệu quả, tôi khuyên bạn nên: 1) Đặt mục tiêu tiết kiệm cụ thể, 2) Theo dõi chi tiêu hàng ngày, 3) Cắt giảm các chi phí không cần thiết. Hiện tại bạn có thể tiết kiệm thêm 15-20% từ chi phí ăn uống.'
  }
  
  if (lowerMessage.includes('thu nhập')) {
    return 'Tổng thu nhập tháng này của bạn là 15.000.000 VNĐ. Sau khi trừ chi tiêu, bạn còn lại 5.091.000 VNĐ. Đây là một tỷ lệ tiết kiệm khá tốt (34%)!'
  }
  
  if (lowerMessage.includes('ngân sách')) {
    return 'Bạn đã thiết lập ngân sách cho 6 danh mục. Hiện tại bạn đang sử dụng tốt ngân sách, với một số hạng mục còn dư: Đi lại (còn 757.000 VNĐ), Giải trí (còn 1.000.000 VNĐ).'
  }
  
  if (lowerMessage.includes('phân tích') || lowerMessage.includes('phân')) {
    return 'Từ dữ liệu của bạn, tôi thấy: Chi tiêu tháng này tăng 15% so với tháng trước. Nguyên nhân chính là tăng chi phí Ăn uống và Giải trí. Tôi gợi ý bạn nên đặt ngân sách chặt chẽ hơn.'
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('giúp') || lowerMessage.includes('hướng dẫn')) {
    return 'Tôi có thể giúp bạn:\n• Xem thông tin thu nhập và chi tiêu\n• Phân tích chi tiêu theo danh mục\n• Đưa ra lời khuyên tiết kiệm\n• Theo dõi ngân sách\n\nHãy hỏi tôi bất cứ điều gì!'
  }

  if (lowerMessage.includes('đầu tư') || lowerMessage.includes('dau tu')) {
    return 'Với số tiền tiết kiệm hiện tại 5.091.000 VNĐ, tôi gợi ý:\n1. Quỹ đầu tư chỉ số (Index Fund) - Rủi ro thấp, lợi nhuận 8-10%/năm\n2. Tiết kiệm định kỳ ngân hàng - An toàn, lãi suất 6-7%/năm\n3. Vàng - Bảo toàn giá trị\n\nNên đa dạng hóa danh mục đầu tư!'
  }

  if (lowerMessage.includes('mục tiêu')) {
    return 'Hiện tại bạn chưa đặt mục tiêu tiết kiệm cụ thể. Tôi gợi ý bạn nên:\n• Đặt mục tiêu ngắn hạn (3-6 tháng)\n• Xác định số tiền cần tiết kiệm\n• Theo dõi tiến độ hàng tháng\n\nVí dụ: Mua laptop 20 triệu trong 6 tháng = tiết kiệm 3.3 triệu/tháng'
  }

  if (lowerMessage.includes('so sánh') || lowerMessage.includes('tháng trước')) {
    return 'So với tháng trước:\n• Thu nhập: Giữ nguyên (15 triệu)\n• Chi tiêu: Tăng 15% (8.6tr → 9.9tr)\n• Tiết kiệm: Giảm 20%\n\nNguyên nhân: Tăng chi phí Ăn uống (+500k) và Giải trí (+800k). Bạn nên kiểm soát 2 hạng mục này!'
  }
  
  return `Tôi hiểu bạn đang hỏi về "${userMessage}". Tôi có thể giúp bạn về quản lý tài chính, phân tích chi tiêu. Bạn có thể hỏi cụ thể hơn được không?`
}

export default {
  sendMessageToGemini,
  getQuickResponse,
}
