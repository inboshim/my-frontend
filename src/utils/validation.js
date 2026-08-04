/**
 * 정수 값이 0 이하이거나 유효하지 않은 값(null, undefined, NaN)인지 체크하는 공통 함수
 */
export const isInvalidOrZeroLess = (value) => {
  // 1. null, undefined, 빈 문자열 등 완전히 비어있는 값 체크
  if (value === null || value === undefined || value === '') {
    return true;
  }
  
  // 2. 숫자로 안전하게 파싱
  const num = Number(value);
  
  // 3. 숫자가 아니거나(NaN) 1 이하인 경우 처리
  return Number.isNaN(num) || num <= 0;
};

/**
 * [신규 추가] 값이 유효한 정수/실수 범위를 벗어났는지 체크하는 공통 함수
 * @param {any} value - 검사할 값
 * @param {number} min - 최소 허용 범위
 * @param {number} max - 최대 허용 범위
 */
export const isOutOfBounds = (value, min, max) => {
  if (value === null || value === undefined || value === '') {
    return true; // 비어있으면 유효하지 않음
  }
  const num = Number(value);
  // 숫자가 아니거나, 지정한 최소/최대 범위를 벗어나면 true(유효하지 않음) 반환
  return Number.isNaN(num) || num < min || num > max;
};