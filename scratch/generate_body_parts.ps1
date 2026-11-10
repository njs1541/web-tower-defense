const fs = require('fs');
const path = require('path');

// PNG 파서 및 생성기 (외부 모듈 없이 순수 JS로 안전하게 처리하기 위해 PNG 인코더/디코더 또는 PowerShell System.Drawing 사용)
// PowerShell System.Drawing이 Windows 환경에서 가장 빠르고 정확함.

