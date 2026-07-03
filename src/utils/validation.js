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