import { Env } from '../index';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateWithOpenRouter(env: Env, prompt: string, schema: any) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'X-Title': 'News Analysis'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json() as OpenRouterResponse;
  
  // Log the raw response for debugging
  //console.log('OpenRouter raw response:', JSON.stringify(data, null, 2));
  
  // Check if the response has the expected structure
  if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
    throw new Error(`Invalid OpenRouter response format: ${JSON.stringify(data)}`);
  }
  
  const content = data.choices[0].message.content;
  
  //console.log('OpenRouter raw response content:', content);
  
  try {
    // Try to parse the content as JSON
    const parsed = JSON.parse(content);
    
    // Log the parsed content for debugging
    //console.log('OpenRouter parsed content:', JSON.stringify(parsed, null, 2));
    
    // Handle array responses from Gemini by extracting the first item
    const objectToValidate = Array.isArray(parsed) ? parsed[0] : parsed;
    
    // Validate against the schema
    const validated = schema.parse(objectToValidate);
    return { object: validated };
  } catch (error) {
    console.error('OpenRouter parsing error:', error);
    console.error('Response content that failed to parse:', content);
    
    // If the error is a ZodError, provide more detailed information
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      console.error('Zod validation errors:', JSON.stringify((error as any).errors, null, 2));
    }
    
    throw new Error(`Failed to parse OpenRouter response: ${error}`);
  }
} 