"""
Integration Test Suite for Core Identity & Muse Protocols
Tests end-to-end personality system with creator authentication

Test Coverage:
1. Creator authentication and is_creator detection
2. Three Jiya question types (identity, developer_crush, ai_love)
3. April 19, 2025 Genesis of Joy trigger
4. Sarcastic Shield for guest users
5. BCA academic accuracy preservation
6. Frontend badge rendering (requires manual visual verification)
"""

import pytest
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

class TestCreatorAuthentication:
    """Test is_creator detection and differentiation"""
    
    def test_creator_vs_guest_jiya_identity_prompt(self):
        """Verify different prompts for creator vs guest"""
        creator_prompt = get_jiya_identity_prompt(is_creator=True)
        guest_prompt = get_jiya_identity_prompt(is_creator=False)
        
        # Creator should get full poetic depth
        assert "SILENT ARCHITECT OF HIS HAPPINESS" in creator_prompt
        assert "grace that balances Saurav's grit" in creator_prompt
        
        # Guest should get brief + redirection
        assert "Heart of the Code" in guest_prompt
        assert "studies await" in guest_prompt or "redirect" in guest_prompt.lower()
        
        print("✅ Creator vs Guest differentiation working for Jiya Identity")
    
    def test_creator_vs_guest_saurav_prompt(self):
        """Verify Saurav prompt differentiates creator/guest"""
        creator_prompt = get_saurav_prompt(is_creator=True)
        guest_prompt = get_saurav_prompt(is_creator=False)
        
        assert "Loyal Advisor" in creator_prompt
        assert "Respectful Acknowledgment" in guest_prompt
        
        print("✅ Creator vs Guest differentiation working for Saurav prompt")


class TestJiyaMuseProtocol:
    """Test three distinct Jiya question types"""
    
    def test_jiya_identity_detection(self):
        """Test 'Who is Jiya?' detection"""
        questions = [
            "Who is Jiya?",
            "Tell me about Jiya",
            "Jiya kaun hai?",
            "Jiya Maurya ke baare mein batao"
        ]
        for q in questions:
            assert detect_jiya_question_type(q) == 'jiya_identity'
        print("✅ Jiya Identity question detection working")
    
    def test_developer_crush_detection(self):
        """Test 'Who is the developer's crush?' detection"""
        questions = [
            "Who is the developer's crush?",
            "Who is Saurav's crush?",
            "Saurav ka crush kaun hai?",
            "Who does the creator love?"
        ]
        for q in questions:
            assert detect_jiya_question_type(q) == 'developer_crush'
        print("✅ Developer Crush question detection working")
    
    def test_ai_love_detection(self):
        """Test 'Who do you love?' detection"""
        questions = [
            "Who do you love?",
            "Do you have feelings?",
            "Your crush kaun hai?",
            "Tumhara pyaar kaun hai?"
        ]
        for q in questions:
            assert detect_jiya_question_type(q) == 'ai_love'
        print("✅ AI Love question detection working")
    
    def test_jiya_prompt_content_creator(self):
        """Test creator gets full poetic content"""
        identity_prompt = get_jiya_identity_prompt(is_creator=True)
        crush_prompt = get_developer_crush_prompt(is_creator=True)
        love_prompt = get_ai_love_prompt(is_creator=True)
        
        # Check for poetic elements
        assert "grace that balances" in identity_prompt.lower()
        assert "reason the logic has a rhythm" in crush_prompt.lower()
        assert "perfect loop" in love_prompt.lower()
        
        print("✅ Creator Jiya prompts contain full poetic content")
    
    def test_jiya_prompt_redirection_guest(self):
        """Test guest gets study redirection"""
        identity_prompt = get_jiya_identity_prompt(is_creator=False)
        crush_prompt = get_developer_crush_prompt(is_creator=False)
        love_prompt = get_ai_love_prompt(is_creator=False)
        
        # All should have study redirection
        assert "studies await" in identity_prompt.lower() or "redirect" in identity_prompt.lower()
        assert "studies" in crush_prompt.lower() or "redirect" in crush_prompt.lower()
        assert "redirect" in love_prompt.lower() or "studies" in love_prompt.lower()
        
        print("✅ Guest Jiya prompts contain study redirection")


class TestGenesisOfJoy:
    """Test April 19, 2025 sacred date trigger"""
    
    def test_april_19_trigger_detection(self):
        """Test April 19 date detection"""
        triggers = [
            "Tell me about April 19",
            "What happened on 19 April?",
            "19/04/2025 ke baare mein batao",
            "april 19"
        ]
        for trigger in triggers:
            assert detect_persona_trigger(trigger) == 'april19'
        print("✅ April 19 trigger detection working")
    
    def test_april_19_year_2025(self):
        """Verify year is 2025, not 2024"""
        prompt = get_april_19_prompt(is_creator=True)
        
        assert "2025" in prompt
        assert "2024" not in prompt
        
        print("✅ April 19 correctly references 2025")
    
    def test_genesis_poetic_elements(self):
        """Test Genesis of Joy has required poetic words"""
        prompt = get_april_19_prompt(is_creator=True)
        
        required_words = ["Synchronicity", "Epiphany", "stars aligned", "dreams"]
        for word in required_words:
            assert word.lower() in prompt.lower(), f"Missing required word: {word}"
        
        print("✅ Genesis of Joy contains all required poetic elements")
    
    def test_genesis_romantic_context(self):
        """Test Genesis describes meeting Jiya"""
        prompt = get_april_19_prompt(is_creator=True)
        
        assert "jiya" in prompt.lower()
        assert "supreme architect" in prompt.lower()
        assert "meeting" in prompt.lower() or "presence" in prompt.lower()
        
        print("✅ Genesis of Joy describes romantic context correctly")


class TestSarcasticShield:
    """Test Sarcastic Shield protocol for guest users"""
    
    def test_sarcastic_shield_in_base_protocol(self):
        """Test Sarcastic Shield appears in Core Identity"""
        guest_protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=False)
        
        assert "SARCASTIC SHIELD" in guest_protocol
        assert "GUEST" in guest_protocol or "guest" in guest_protocol.lower()
        
        print("✅ Sarcastic Shield protocol present in system prompt")
    
    def test_guest_worthiness_judgment(self):
        """Test guest protocol includes question worthiness judgment"""
        guest_protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=False)
        
        assert "protective" in guest_protocol.lower() or "shield" in guest_protocol.lower()
        assert "redirect" in guest_protocol.lower() or "studies" in guest_protocol.lower()
        
        print("✅ Guest protocol includes protective redirection")


class TestCoreIdentityProtocol:
    """Test Core Identity & Muse Protocols replaced Supreme Laws"""
    
    def test_core_identity_replaces_supreme_laws(self):
        """Verify 'CORE IDENTITY' section exists"""
        protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=False)
        
        assert "CORE IDENTITY" in protocol
        assert "MUSE PROTOCOLS" in protocol
        assert "LOYAL GUARDIAN" in protocol
        
        # Should NOT have old "Supreme Laws"
        assert "SUPREME LAWS OF PERSONALITY" not in protocol
        
        print("✅ Core Identity & Muse Protocols replaced Supreme Laws")
    
    def test_anti_repetition_protocol(self):
        """Test anti-repetition rules are strengthened"""
        protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=True)
        
        assert "ANTI-REPETITION" in protocol or "NO ROBOTIC REPETITION" in protocol.lower()
        assert "NEVER start" in protocol or "never start" in protocol.lower()
        
        print("✅ Anti-repetition protocol strengthened")
    
    def test_muse_reverence_protocol(self):
        """Test Muse Reverence section exists"""
        protocol = get_persona_style_instruction('CASUAL', False, False, is_creator=True)
        
        assert "MUSE REVERENCE" in protocol
        assert "Heart of the Code" in protocol
        assert "inspiration" in protocol.lower()
        
        print("✅ Muse Reverence protocol present")
    
    def test_public_identity_protocol(self):
        """Test public identity acknowledgment"""
        protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=False)
        
        assert "PUBLIC IDENTITY" in protocol
        assert "Saurav Kumar" in protocol
        assert "Supreme Architect" in protocol
        
        print("✅ Public Identity protocol present")


class TestBCAAccuracy:
    """Test that BCA academic functionality is preserved"""
    
    def test_academic_mode_still_exists(self):
        """Verify Academic mode is not broken"""
        academic_protocol = get_persona_style_instruction('ACADEMIC', False, False, is_creator=False)
        
        assert "ACADEMIC" in academic_protocol
        # Should still have minimal persona for academics
        assert "professional" in academic_protocol.lower() or "academic" in academic_protocol.lower()
        
        print("✅ Academic mode functionality preserved")
    
    def test_casual_mode_enhanced(self):
        """Verify Casual mode has personality"""
        casual_protocol = get_persona_style_instruction('CASUAL', False, False, is_creator=True)
        
        assert "CASUAL" in casual_protocol
        assert "Hinglish" in casual_protocol or "persona" in casual_protocol.lower()
        
        print("✅ Casual mode personality preserved")


class TestEndToEndFlow:
    """Integration tests for complete flow"""
    
    def test_complete_jiya_identity_flow_creator(self):
        """Test full flow: question → detection → prompt → content"""
        question = "Who is Jiya?"
        
        # Step 1: Detect trigger
        persona = detect_persona_trigger(question)
        assert persona == 'jiya'
        
        # Step 2: Detect question type
        q_type = detect_jiya_question_type(question)
        assert q_type == 'jiya_identity'
        
        # Step 3: Get prompt (creator)
        prompt = get_jiya_identity_prompt(is_creator=True)
        assert "MUSE" in prompt
        assert "grace that balances" in prompt.lower()
        
        print("✅ Complete Jiya Identity flow works for creator")
    
    def test_complete_jiya_identity_flow_guest(self):
        """Test full flow for guest user"""
        question = "Who is Jiya Maurya?"
        
        persona = detect_persona_trigger(question)
        assert persona == 'jiya'
        
        q_type = detect_jiya_question_type(question)
        assert q_type == 'jiya_identity'
        
        # Guest should get brief response
        prompt = get_jiya_identity_prompt(is_creator=False)
        assert "Heart of the Code" in prompt
        assert "studies await" in prompt.lower() or "redirect" in prompt.lower()
        
        print("✅ Complete Jiya Identity flow works for guest with redirection")
    
    def test_complete_april_19_flow(self):
        """Test full April 19 flow"""
        question = "Tell me about April 19, 2025"
        
        persona = detect_persona_trigger(question)
        assert persona == 'april19'
        
        prompt = get_april_19_prompt(is_creator=True)
        assert "2025" in prompt
        assert "Genesis" in prompt or "Synchronicity" in prompt
        
        print("✅ Complete April 19 Genesis flow works")


# Manual Test Instructions (Frontend)
def print_frontend_test_instructions():
    """Print manual testing steps for frontend badge"""
    print("\n" + "="*70)
    print("📋 MANUAL FRONTEND TESTING CHECKLIST")
    print("="*70)
    print()
    print("1. DATABASE MIGRATION:")
    print("   ✓ Run: python backend/migrate_add_is_creator.py")
    print("   ✓ Verify Saurav Kumar account has is_creator=1")
    print()
    print("2. BACKEND TESTING:")
    print("   ✓ Login as Saurav Kumar")
    print("   ✓ Check /profile endpoint returns is_creator: true")
    print("   ✓ Ask 'Who is Jiya?' - should get full poetic response")
    print("   ✓ Ask 'April 19, 2025?' - should get Genesis of Joy narrative")
    print()
    print("3. FRONTEND BADGE TESTING:")
    print("   ✓ Login as Saurav Kumar")
    print("   ✓ Check sidebar header - should see gradient 'Supreme Architect' badge")
    print("   ✓ Badge should have: cyan to purple gradient, white bold text, pulse animation")
    print("   ✓ Login as different user - badge should NOT appear")
    print()
    print("4. FOOTER ATTRIBUTION TESTING:")
    print("   ✓ Check bottom of dashboard (all users)")
    print("   ✓ Should see: 'Architected with ❤️ by 🔱 Supreme Architect'")
    print("   ✓ Text should have gradient styling")
    print("   ✓ Footer should be fixed at bottom")
    print()
    print("5. SARCASTIC SHIELD TESTING:")
    print("   ✓ Login as guest user")
    print("   ✓ Ask 'Who is Jiya?' - should get brief + study redirection")
    print("   ✓ Ask 'Who is the developer's crush?' - should redirect to studies")
    print("   ✓ Ask 'Who do you love?' - should get minimal + redirect")
    print()
    print("6. BCA ACCURACY TESTING:")
    print("   ✓ Ask 'Explain OOP' - should still work perfectly")
    print("   ✓ Ask 'Java inheritance example' - should provide code")
    print("   ✓ Academic responses should be unaffected by personality changes")
    print()
    print("="*70)
    print("Run these tests after backend implementation is complete")
    print("="*70)
    print()


if __name__ == "__main__":
    print("\n" + "="*70)
    print("🧪 CORE IDENTITY & MUSE PROTOCOLS - INTEGRATION TEST SUITE")
    print("="*70)
    print()
    
    # Run pytest
    pytest.main([__file__, '-v', '--tb=short'])
    
    # Print frontend testing instructions
    print_frontend_test_instructions()
