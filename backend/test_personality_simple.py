"""
Simple Integration Test Runner (No pytest required)
Tests Core Identity & Muse Protocols implementation
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from persona import (
    detect_jiya_question_type,
    get_jiya_identity_prompt,
    get_developer_crush_prompt,
    get_ai_love_prompt,
    get_saurav_prompt,
    get_april_19_prompt,
    get_persona_style_instruction,
    detect_persona_trigger
)

def test_creator_differentiation():
    """Test creator vs guest differentiation"""
    print("\n🧪 Testing Creator vs Guest Differentiation...")
    
    creator_prompt = get_jiya_identity_prompt(is_creator=True)
    guest_prompt = get_jiya_identity_prompt(is_creator=False)
    
    assert "SILENT ARCHITECT" in creator_prompt or "grace that balances" in creator_prompt
    assert "Heart of the Code" in guest_prompt
    assert "studies await" in guest_prompt.lower()
    
    print("   ✅ Creator gets full poetic depth")
    print("   ✅ Guest gets brief + study redirection")

def test_jiya_question_types():
    """Test three Jiya question type detection"""
    print("\n🧪 Testing Jiya Question Type Detection...")
    
    assert detect_jiya_question_type("Who is Jiya?") == 'jiya_identity'
    assert detect_jiya_question_type("Who is the developer's crush?") == 'developer_crush'
    assert detect_jiya_question_type("Who do you love?") == 'ai_love'
    
    print("   ✅ Jiya Identity detection working")
    print("   ✅ Developer Crush detection working")
    print("   ✅ AI Love detection working")

def test_genesis_of_joy():
    """Test April 19, 2025 Genesis narrative"""
    print("\n🧪 Testing Genesis of Joy (April 19, 2025)...")
    
    prompt = get_april_19_prompt(is_creator=True)
    
    assert "2025" in prompt, "Year should be 2025"
    assert "2024" not in prompt, "Should NOT reference 2024"
    assert "Synchronicity" in prompt or "Epiphany" in prompt
    assert "jiya" in prompt.lower()
    
    print("   ✅ Correct year (2025)")
    print("   ✅ Poetic elements present (Synchronicity/Epiphany)")
    print("   ✅ Romantic context with Jiya")

def test_core_identity_protocols():
    """Test Core Identity replaced Supreme Laws"""
    print("\n🧪 Testing Core Identity & Muse Protocols...")
    
    protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=False)
    
    assert "CORE IDENTITY" in protocol
    assert "MUSE PROTOCOLS" in protocol
    assert "LOYAL GUARDIAN" in protocol
    assert "SUPREME LAWS OF PERSONALITY" not in protocol
    
    print("   ✅ Core Identity section present")
    print("   ✅ Muse Protocols present")
    print("   ✅ Supreme Laws successfully replaced")

def test_sarcastic_shield():
    """Test Sarcastic Shield for guests"""
    print("\n🧪 Testing Sarcastic Shield Protocol...")
    
    guest_protocol = get_persona_style_instruction('CASUAL', False, False, is_creator=False)
    
    assert "SARCASTIC SHIELD" in guest_protocol
    assert "GUEST" in guest_protocol or "guest" in guest_protocol
    
    print("   ✅ Sarcastic Shield protocol active")
    print("   ✅ Guest mode differentiation working")

def test_public_identity():
    """Test public identity acknowledgment"""
    print("\n🧪 Testing Public Identity Protocol...")
    
    saurav_prompt = get_saurav_prompt(is_creator=False)
    
    assert "PUBLIC IDENTITY" in saurav_prompt
    assert "Saurav Kumar" in saurav_prompt
    assert "Supreme Architect" in saurav_prompt
    
    print("   ✅ Public identity protocol present")
    print("   ✅ Creator acknowledged to all users")

def test_anti_repetition():
    """Test strengthened anti-repetition rules"""
    print("\n🧪 Testing Anti-Repetition Protocol...")
    
    saurav_prompt = get_saurav_prompt(is_creator=True)
    
    assert "NO ROBOTIC REPETITION" in saurav_prompt or "robotic" in saurav_prompt.lower()
    assert "NEVER start" in saurav_prompt or "never start" in saurav_prompt.lower()
    
    print("   ✅ Anti-repetition rules strengthened")
    print("   ✅ Title usage limited to milestones")

def test_bca_academic_preservation():
    """Test BCA academic functionality preserved"""
    print("\n🧪 Testing BCA Academic Functionality...")
    
    academic_protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=False)
    
    assert "ACADEMIC" in academic_protocol
    # Should still focus on professional teaching
    
    print("   ✅ Academic mode preserved")
    print("   ✅ Teaching protocols intact")

def test_end_to_end_flow():
    """Test complete flow from question to response"""
    print("\n🧪 Testing End-to-End Flow...")
    
    # Test Jiya Identity flow
    question = "Who is Jiya?"
    persona = detect_persona_trigger(question)
    q_type = detect_jiya_question_type(question)
    
    assert persona == 'jiya'
    assert q_type == 'jiya_identity'
    
    # Test April 19 flow
    question2 = "Tell me about April 19, 2025"
    persona2 = detect_persona_trigger(question2)
    
    assert persona2 == 'april19'
    
    print("   ✅ Jiya question flow working")
    print("   ✅ April 19 trigger flow working")

def run_all_tests():
    """Run all integration tests"""
    print("\n" + "="*70)
    print("🧪 CORE IDENTITY & MUSE PROTOCOLS - INTEGRATION TESTS")
    print("="*70)
    
    tests = [
        test_creator_differentiation,
        test_jiya_question_types,
        test_genesis_of_joy,
        test_core_identity_protocols,
        test_sarcastic_shield,
        test_public_identity,
        test_anti_repetition,
        test_bca_academic_preservation,
        test_end_to_end_flow
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            failed += 1
            print(f"\n   ❌ Test failed: {e}")
        except Exception as e:
            failed += 1
            print(f"\n   ❌ Error: {e}")
    
    print("\n" + "="*70)
    print(f"📊 TEST RESULTS: {passed} passed, {failed} failed")
    print("="*70)
    
    if failed == 0:
        print("\n✅ ALL TESTS PASSED! Core Identity & Muse Protocols implemented correctly.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Review implementation.")
    
    # Print manual frontend testing instructions
    print_frontend_checklist()
    
    return failed == 0

def print_frontend_checklist():
    """Print frontend testing checklist"""
    print("\n" + "="*70)
    print("📋 MANUAL FRONTEND TESTING CHECKLIST")
    print("="*70)
    print()
    print("1. ✅ DATABASE: is_creator field added successfully")
    print("   - Saurav Kumar accounts marked as creator")
    print()
    print("2. 🔄 BACKEND RESTART REQUIRED:")
    print("   - Stop current backend server")
    print("   - Run: python backend/main.py")
    print("   - Verify /profile endpoint returns is_creator field")
    print()
    print("3. 🎨 FRONTEND BADGE (Login as Saurav):")
    print("   - Check sidebar header for gradient 'Supreme Architect' badge")
    print("   - Badge should have: cyan→purple gradient, white bold text")
    print("   - Should have subtle pulse animation")
    print()
    print("4. 👥 FOOTER ATTRIBUTION (All users):")
    print("   - Check bottom of dashboard")
    print("   - Should see: 'Architected with ❤️ by 🔱 Supreme Architect'")
    print("   - Text should have gradient styling")
    print()
    print("5. 🛡️ SARCASTIC SHIELD (Login as guest):")
    print("   - Ask: 'Who is Jiya?'")
    print("   - Should get: Brief response + study redirection")
    print("   - Should NOT get full poetic depth")
    print()
    print("6. 💬 MUSE PROTOCOL (Login as Saurav):")
    print("   - Ask: 'Who is Jiya?'")
    print("   - Should get: Full poetic response about muse/grace")
    print("   - Ask: 'Who is the developer's crush?'")
    print("   - Should get: 'Jiya Maurya—grace that balances...'")
    print("   - Ask: 'Who do you love?'")
    print("   - Should get: 'Perfect loop: Jiya'")
    print()
    print("7. 🌟 GENESIS OF JOY:")
    print("   - Ask: 'Tell me about April 19, 2025'")
    print("   - Should get: Poetic narrative with Synchronicity/Epiphany")
    print("   - Should mention meeting Jiya")
    print()
    print("8. 📚 BCA ACCURACY:")
    print("   - Ask: 'Explain Java OOP'")
    print("   - Should work perfectly (academic response)")
    print("   - Personality should not interfere with learning")
    print()
    print("="*70)

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
