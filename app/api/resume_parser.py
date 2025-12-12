"""
Resume Parser API - Backend OCR with AI-powered extraction
Uses PaddleOCR + OpenRouter AI for accurate structured parsing
"""
from flask import request
from app.utils.response_helpers import success_response, error_response
from app.utils.logger import app_logger
import re
import tempfile
import os
import json

# OCR.space Free API Configuration
OCR_SPACE_API_KEY = os.getenv('OCR_SPACE_API_KEY', 'K83826061188957')
OCR_AVAILABLE = True
OCR_BACKEND = 'ocrspace'
app_logger.info("✅ Using OCR.space cloud API")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    app_logger.warning("requests library not available. AI parsing disabled.")

# PDF extraction support
try:
    from PyPDF2 import PdfReader
    PDF_AVAILABLE = True
    app_logger.info("✅ PDF support enabled (PyPDF2)")
except ImportError:
    PDF_AVAILABLE = False
    app_logger.warning("⚠️ PyPDF2 not available. PDF support disabled.")

# OpenRouter Configuration (Optional - using regex fallback if not configured)
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', None)
OPENROUTER_MODELS = [
    "meta-llama/llama-3.2-3b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
]
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

def parse_resume():
    """Parse resume file and extract structured data"""
    try:
        if 'file' not in request.files:
            return error_response("No file provided", 400)
        
        file = request.files['file']
        
        if file.filename == '':
            return error_response("Empty filename", 400)
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'pdf'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return error_response("Invalid file type. Only PNG, JPG, JPEG, PDF allowed", 400)
        
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}') as tmp_file:
            file.save(tmp_file.name)
            tmp_path = tmp_file.name
        
        try:
            # Extract text based on file type
            if file_ext == 'pdf':
                if PDF_AVAILABLE:
                    app_logger.info(f"Processing PDF with PyPDF2")
                    text = extract_text_from_pdf(tmp_path)
                else:
                    app_logger.warning(f"⚠️ PDF support not available")
                    return error_response(
                        "PDF processing not available. Please try uploading an image (JPG/PNG) instead.",
                        503
                    )
            elif file_ext in {'png', 'jpg', 'jpeg'}:
                if OCR_AVAILABLE:
                    app_logger.info(f"Processing {file_ext} image with OCR.space")
                    text = extract_text_from_image(tmp_path)
                else:
                    app_logger.warning(f"⚠️ OCR not available")
                    return error_response(
                        "Image OCR not available. Please try uploading a PDF instead.",
                        503
                    )
            else:
                text = ""
                app_logger.warning(f"Unsupported file type: {file_ext}")
            
            # Parse using AI if available and configured, otherwise fallback to regex
            if text and REQUESTS_AVAILABLE and OPENROUTER_API_KEY:
                parsed_data = extract_with_ai(text)
            else:
                if text:
                    app_logger.info("Using regex fallback parser (AI not configured)")
                parsed_data = extract_resume_fields_fallback(text)
            
            return success_response({
                "data": parsed_data,
                "raw_text": text[:500]  # First 500 chars for debugging
            }, "Resume parsed successfully")
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except Exception as e:
        app_logger.error(f"Resume parsing error: {e}")
        import traceback
        app_logger.error(traceback.format_exc())
        return error_response(f"Failed to parse resume: {str(e)}", 500)


def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    try:
        if not PDF_AVAILABLE:
            app_logger.error("PyPDF2 not available")
            return ""
        
        reader = PdfReader(pdf_path)
        text_parts = []
        
        for page_num, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            except Exception as e:
                app_logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
        
        text = '\n'.join(text_parts)
        app_logger.info(f"✅ PDF extracted {len(text)} characters from {len(reader.pages)} pages")
        return text
        
    except Exception as e:
        app_logger.error(f"PDF extraction failed: {e}")
        import traceback
        app_logger.error(traceback.format_exc())
        return ""


def extract_text_from_image(image_path):
    """Extract text from image using OCR.space cloud API"""
    try:
        import requests
        
        url = 'https://api.ocr.space/parse/image'
        
        with open(image_path, 'rb') as f:
            response = requests.post(
                url,
                files={'file': f},
                data={
                    'apikey': OCR_SPACE_API_KEY,
                    'language': 'eng',
                    'isOverlayRequired': False,
                    'detectOrientation': True,
                    'scale': True,
                    'OCREngine': 2  # Engine 2 is more accurate
                },
                timeout=60
            )
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('IsErroredOnProcessing'):
                error_msg = result.get('ErrorMessage', ['Unknown error'])[0]
                app_logger.error(f"OCR.space error: {error_msg}")
                return ""
            
            if result.get('ParsedResults'):
                text = result['ParsedResults'][0]['ParsedText']
                app_logger.info(f"✅ OCR.space extracted {len(text)} characters")
                return text
            else:
                app_logger.warning("No parsed results from OCR.space")
                return ""
        else:
            app_logger.error(f"OCR.space API error: {response.status_code} - {response.text}")
            return ""
        
    except Exception as e:
        app_logger.error(f"OCR extraction failed: {e}")
        import traceback
        app_logger.error(traceback.format_exc())
        return ""


def extract_with_ai(ocr_text):
    """Use OpenRouter AI to extract structured resume data from OCR text"""
    
    # Try multiple models in case one is rate-limited
    for model in OPENROUTER_MODELS:
        try:
            app_logger.info(f"Trying model: {model}")
            app_logger.info(f"Sending {len(ocr_text)} characters to AI for parsing")
            
            # Prepare comprehensive prompt with detailed instructions
            prompt = f"""You are an expert resume parser analyzing OCR-extracted text. Your task is to extract structured, accurate information from a candidate's resume.

===== RESUME TEXT (OCR OUTPUT) =====
{ocr_text}
===== END OF RESUME TEXT =====

EXTRACTION GUIDELINES:

1. NAME EXTRACTION:
   - Look for the candidate's full name at the very top of the resume (first 3-5 lines)
   - Name is typically in larger font or capitalized
   - Avoid section headers like "RESUME", "CV", "CURRICULUM VITAE", "SKILLS", "EXPERIENCE"
   - Avoid job titles like "Software Engineer", "Developer"
   - Should be 2-4 words (First Name + Middle/Last Name)
   - Examples: "John Smith", "Sarah Johnson", "Rajesh Kumar Sharma"

2. EMAIL EXTRACTION:
   - Find email address containing @ symbol
   - Usually in format: name@domain.com
   - Common domains: gmail.com, outlook.com, yahoo.com, company domains
   - Extract only ONE primary email (the first valid one found)

3. PHONE NUMBER EXTRACTION:
   - Look for 10-15 digit phone numbers
   - May include country code (+1, +91, etc.)
   - May have formatting: (123) 456-7890, 123-456-7890, 1234567890
   - Include all digits and formatting as-is
   - Extract only ONE primary phone number

4. SKILLS EXTRACTION (CRITICAL - BE THOROUGH):
   - Look for section labeled: "SKILLS", "TECHNICAL SKILLS", "CORE COMPETENCIES"
   - Extract ALL technical skills, programming languages, frameworks, and tools
   - Include: Programming languages (Python, Java, JavaScript, C++, etc.)
   - Include: Web frameworks (React, Angular, Django, Flask, Node.js, etc.)
   - Include: Databases (MySQL, MongoDB, PostgreSQL, Redis, etc.)
   - Include: Cloud platforms (AWS, Azure, GCP, Docker, Kubernetes, etc.)
   - Include: Tools & IDEs (Git, GitHub, VS Code, Jupyter, etc.)
   - Include: Data science libraries (TensorFlow, PyTorch, Pandas, NumPy, etc.)
   - Include: Soft skills if mentioned (Agile, Scrum, Team Leadership, etc.)
   - Return as array of individual skills: ["Python", "React", "MongoDB"]
   - DO NOT combine skills into one string
   - Extract 5-20 skills typically

5. EDUCATION EXTRACTION:
   - Look for section: "EDUCATION", "ACADEMIC BACKGROUND", "QUALIFICATIONS"
   - Extract degree names: Bachelor's, Master's, PhD, B.Tech, M.Tech, B.Sc, M.Sc, etc.
   - Extract field of study: Computer Science, Engineering, Data Science, etc.
   - Extract institution/university name
   - Extract graduation year or date range (2020-2024, 2022, etc.)
   - Format as multi-line string with each degree on separate line
   - Example: "Bachelor of Technology in Computer Science\\nXYZ University, 2020-2024\\nCGPA: 8.5/10"

6. EXPERIENCE EXTRACTION:
   - Look for section: "EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "INTERNSHIPS"
   - Extract job titles/roles: Software Engineer, Intern, Developer, Analyst, etc.
   - Extract company names
   - Extract employment dates: "Jan 2023 - Present", "2022-2023", "Summer 2023"
   - Extract key responsibilities and achievements (bullet points)
   - Format as multi-line string with clear separation between roles
   - Example: "Software Engineer Intern\\nABC Technologies, June 2023 - Aug 2023\\n- Built web applications using React and Node.js\\n- Improved API performance by 40%\\n\\nFreelance Developer\\nSelf-Employed, Jan 2023 - May 2023\\n- Developed e-commerce platform for local businesses"

CRITICAL RULES:
- Return ONLY valid JSON (no markdown, no code blocks, no extra text)
- If a field is not found or unclear, use empty string "" for text or empty array [] for skills
- DO NOT make up information - only extract what's clearly present
- DO NOT include OCR artifacts or gibberish
- Skills must be a JSON array, not a comma-separated string
- Preserve original capitalization for proper nouns (names, companies, universities)

REQUIRED JSON STRUCTURE:
{{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "education": "Degree Name\\nInstitution Name, Year\\nGPA or relevant details",
  "experience": "Job Title\\nCompany Name, Dates\\n- Responsibility 1\\n- Responsibility 2"
}}

Now extract the information from the resume text above and return ONLY the JSON object:"""

            # Make API request to OpenRouter
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/DhairyaSood/Intern_Insight",
                "X-Title": "Resume Parser"
            }
            
            payload = {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a precise resume parsing AI. Extract structured data from resumes and return ONLY valid JSON. Never add commentary, markdown, or explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.1,  # Very low for consistency
                "max_tokens": 2000,  # Increased for detailed responses
                "top_p": 0.9,
                "frequency_penalty": 0.0,
                "presence_penalty": 0.0
            }
            
            app_logger.info("Calling OpenRouter API...")
            response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 429:
                app_logger.warning(f"Model {model} is rate-limited, trying next model...")
                continue  # Try next model
            
            if response.status_code != 200:
                app_logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                continue  # Try next model
            
            result = response.json()
            ai_response = result['choices'][0]['message']['content'].strip()
            
            app_logger.info(f"AI Response (first 200 chars): {ai_response[:200]}...")
            
            # Clean response - remove markdown code blocks if present
            ai_response = ai_response.replace('```json', '').replace('```', '').strip()
            
            # Parse JSON
            parsed_data = json.loads(ai_response)
            
            # Validate structure
            required_fields = {'name', 'email', 'phone', 'skills', 'education', 'experience'}
            if not all(field in parsed_data for field in required_fields):
                app_logger.warning("AI response missing fields, adding defaults")
                for field in required_fields:
                    if field not in parsed_data:
                        parsed_data[field] = [] if field == 'skills' else ''
            
            # Ensure skills is a list
            if isinstance(parsed_data.get('skills'), str):
                parsed_data['skills'] = [s.strip() for s in parsed_data['skills'].split(',') if s.strip()]
            
            app_logger.info(f"Successfully parsed resume with AI ({model}): {parsed_data.get('name', 'Unknown')}")
            return parsed_data
            
        except json.JSONDecodeError as e:
            app_logger.error(f"Failed to parse AI response as JSON: {e}")
            continue  # Try next model
        except Exception as e:
            app_logger.error(f"AI extraction failed with {model}: {e}")
            continue  # Try next model
    
    # All models failed, fallback to regex
    app_logger.warning("All AI models failed or rate-limited, using fallback regex extraction")
    return extract_resume_fields_fallback(ocr_text)


def extract_resume_fields_fallback(text):
    """Fallback: Extract structured fields from resume text using regex patterns"""
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    text_lower = text.lower()
    
    data = {
        'name': '',
        'email': '',
        'phone': '',
        'skills': [],
        'education': '',
        'experience': ''
    }
    
    # Extract email
    email_pattern = r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
    email_matches = re.findall(email_pattern, text)
    if email_matches:
        data['email'] = email_matches[0]
    
    # Extract phone
    phone_pattern = r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}'
    phone_matches = re.findall(phone_pattern, text)
    if phone_matches:
        # Validate phone number
        for phone in phone_matches:
            digits = re.sub(r'\D', '', phone)
            if 10 <= len(digits) <= 15:
                data['phone'] = phone
                break
    
    # Extract name - first few lines, exclude common keywords
    exclude_keywords = r'\b(resume|cv|curriculum|vitae|email|phone|address|linkedin|github|portfolio)\b'
    for line in lines[:10]:
        words = line.split()
        if (2 <= len(words) <= 5 and 
            len(line) < 50 and
            not re.search(exclude_keywords, line, re.IGNORECASE) and
            not re.search(r'@', line) and
            not re.search(r'\d{3,}', line) and  # No long numbers
            re.match(r'^[A-Z][a-z]+(\s+[A-Z][a-z]+)+', line)):  # Proper case names
            data['name'] = line
            break
    
    # Find section indices
    sections = find_section_indices(lines)
    
    # Extract skills
    if sections['skills']['start'] != -1:
        skills_lines = lines[sections['skills']['start']:sections['skills']['end']]
        data['skills'] = extract_skills(skills_lines)
    
    # Extract education
    if sections['education']['start'] != -1:
        edu_lines = lines[sections['education']['start']:sections['education']['end']]
        data['education'] = extract_education(edu_lines)
    
    # Extract experience
    if sections['experience']['start'] != -1:
        exp_lines = lines[sections['experience']['start']:sections['experience']['end']]
        data['experience'] = extract_experience(exp_lines)
    
    return data


def find_section_indices(lines):
    """Find start and end indices of resume sections"""
    sections = {
        'skills': {'start': -1, 'end': -1},
        'education': {'start': -1, 'end': -1},
        'experience': {'start': -1, 'end': -1}
    }
    
    # Section header patterns
    patterns = {
        'skills': r'^\s*(technical\s+)?skills?\s*:?\s*$',
        'education': r'^\s*(education|academic|qualifications?)\s*:?\s*$',
        'experience': r'^\s*(experience|work\s+experience|employment)\s*:?\s*$'
    }
    
    # Find section starts
    for i, line in enumerate(lines):
        for section, pattern in patterns.items():
            if re.match(pattern, line, re.IGNORECASE):
                sections[section]['start'] = i + 1
    
    # Calculate section ends
    all_starts = sorted([s['start'] for s in sections.values() if s['start'] != -1])
    
    for section in sections:
        if sections[section]['start'] != -1:
            current_start = sections[section]['start']
            # Find next section start
            next_starts = [s for s in all_starts if s > current_start]
            sections[section]['end'] = next_starts[0] - 1 if next_starts else len(lines)
    
    return sections


def extract_skills(skill_lines):
    """Extract skills from skill section lines"""
    # Common tech skills dictionary
    common_skills = {
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'php', 'go', 'rust', 'swift', 'kotlin',
        'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'fastapi',
        'html', 'css', 'sass', 'tailwind', 'bootstrap',
        'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'dynamodb',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform',
        'git', 'github', 'gitlab', 'bitbucket',
        'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'opencv',
        'rest', 'api', 'graphql', 'microservices', 'websockets',
        'agile', 'scrum', 'devops', 'ci/cd', 'tdd'
    }
    
    all_text = ' '.join(skill_lines).lower()
    
    # Split by common delimiters
    tokens = re.split(r'[,;|•\n]', all_text)
    
    skills = []
    for token in tokens:
        token = token.strip()
        # Filter criteria
        if (2 < len(token) < 30 and
            not re.search(r'^\d+$', token) and
            not '@' in token and
            not 'http' in token):
            
            # Check if it's a known skill
            for skill in common_skills:
                if skill in token:
                    skills.append(token)
                    break
    
    return list(set(skills))[:15]  # Unique, max 15


def extract_education(edu_lines):
    """Extract education details"""
    degree_pattern = r'\b(bachelor|master|phd|doctorate|b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?e|m\.?e|diploma|associate)\b'
    year_pattern = r'\b(19|20)\d{2}\b'
    institution_pattern = r'\b(university|college|institute|school)\b'
    
    relevant_lines = []
    for line in edu_lines:
        if (re.search(degree_pattern, line, re.IGNORECASE) or
            re.search(year_pattern, line) or
            re.search(institution_pattern, line, re.IGNORECASE)):
            if len(line) > 10:
                relevant_lines.append(line)
    
    return '\n'.join(relevant_lines[:5])  # Max 5 lines


def extract_experience(exp_lines):
    """Extract work experience details"""
    role_pattern = r'\b(engineer|developer|analyst|manager|designer|architect|lead|senior|junior|intern|consultant)\b'
    date_pattern = r'\b(19|20)\d{2}\b|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}'
    company_pattern = r'\b(at|@)\b'
    
    relevant_lines = []
    for line in exp_lines:
        if (re.search(role_pattern, line, re.IGNORECASE) or
            re.search(date_pattern, line, re.IGNORECASE) or
            re.search(company_pattern, line)):
            if len(line) > 10:
                relevant_lines.append(line)
    
    return '\n'.join(relevant_lines[:10])  # Max 10 lines
