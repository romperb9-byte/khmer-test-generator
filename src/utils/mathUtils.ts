const unicodeSuperscripts: Record<string, string> = {
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f', 'ᵍ': 'g', 'ʰ': 'h', 'ⁱ': 'i', 'ʲ': 'j',
  'ᵏ': 'k', 'ˡ': 'l', 'ᵐ': 'm', 'ⁿ': 'n', 'ᵒ': 'o', 'ᵖ': 'p', 'ʳ': 'r', 'ˢ': 's', 'ᵗ': 't', 'ᵘ': 'u',
  'ᵛ': 'v', 'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')'
};

const unicodeSubscripts: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x', 'ᵧ': 'y', 'ₕ': 'h', 'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n',
  'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')'
};

/**
 * Preprocesses a mathematical Khmer/LaTeX question or option string to ensure that:
 * 1. Khmer keyboard typos (like Khan symbol '។' mistakenly typed as backslash) are normalized to '\'.
 * 2. Unbacked 'frac' or 'sqrt' LaTeX keywords are normalized with a leading backslash.
 * 3. Unicode superscript/subscript exponents are converted back to standard LaTeX style exponents.
 * 4. Fractions, square roots, and basic polynomial/equation forms are properly wrapped in mathematical dollar tags ($) so KaTeX renders them perfectly.
 */
export function preprocessMathForDisplay(text: string): string {
  if (!text) return "";

  let processed = text;

  // 1. Correct Khmer Khan '។' typo used as backslash (e.g. ។frac, ។rac, ។sqrt, etc.)
  processed = processed.replace(/។(rac|frac|sqrt|times|div|cdot|le|ge|neq|approx|pi|alpha|beta|theta|omega)/g, '\\$1');

  // 2. Correct missing backslash before frac/sqrt when not preceded by backslash
  processed = processed.replace(/(?<!\\)f?rac\{([^}]*)\}\{([^}]*)\}/g, '\\frac{$1}{$2}');
  processed = processed.replace(/(?<!\\)sqrt\{([^}]*)\}/g, '\\sqrt{$1}');
  processed = processed.replace(/(?<!\\)sqrt\[([^\]]*)\]\{([^}]*)\}/g, '\\sqrt[$1]{$2}');

  // 3. Convert parenthesized expressions inside superscripts, e.g. a^(n) -> a^{n} or a^(x+1) -> a^{x+1}
  processed = processed.replace(/\^\(([^)]+)\)/g, '^{$1}');

  // 4. Convert Unicode superscripts & subscripts in potential formulas to LaTeX form
  processed = processed.replace(/([a-zA-Z0-9\)\}])([⁰¹²³⁴⁵⁶⁷⁸⁹ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ⁺⁻⁼⁽⁾]+)/g, (match, base, sup) => {
    const normalSup = sup.split('').map((c: string) => unicodeSuperscripts[c] || c).join('');
    return `${base}^{${normalSup}}`;
  });

  processed = processed.replace(/([a-zA-Z0-9\)\}])([₀₁₂₃₄₅₆₇₈₉ₐₑₒₓᵧₕₖₗₘₙₚᵣₛₜ₊₋₌₍₎]+)/g, (match, base, sub) => {
    const normalSub = sub.split('').map((c: string) => unicodeSubscripts[c] || c).join('');
    return `${base}_{${normalSub}}`;
  });

  // 5. Ensure any equation or term with LaTeX commands (\frac, \sqrt, etc.) but NO '$' is properly wrapped in a math block.
  // We search for standard mathematical statements, such as: A = \frac{15x^{5}y^{3}}{3x^{2}y^{2}}
  // Let's identify math statements that have no dollars.
  if (!processed.includes('$')) {
    // Match equations like: A = \frac{...}{...}, or simply expressions containing fractions/square roots
    const formulaRegex = /(([A-Za-z0-9\s_+*\-\/()]+\s*=\s*)?\\(frac|sqrt|times|div|cdot|le|ge|neq|approx)\s*\{[^}]*\}[\s\w^{}+\-\/*%()={}]*)/g;
    
    if (formulaRegex.test(processed)) {
      processed = processed.replace(formulaRegex, '$$$1$$');
    } else {
      // Check if there are raw \frac or \sqrt structures that aren't parts of large equations and wrap them
      processed = processed.replace(/(\\(frac|sqrt)\{[^}]*\}\{[^}]*\}|\\(frac|sqrt)\{[^}]*\})/g, '$$$1$$');
    }
  }

  // 6. Clean double dollars inside parentheses: e.g. ($$A$$) -> $$A$$ or $A$
  processed = processed.replace(/\$\$\s*\(([^)]+)\)\s*\$\$/g, '$$$1$$');
  processed = processed.replace(/\$\s*\(([^)]+)\)\s*\$/g, '$$$1$$');
  
  // 7. Simplify extra dollars or double wrappers if they occur
  processed = processed.replace(/\$\$\$\$/g, '$$');

  return processed;
}
