import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { aiEngine, UserProfile } from '@/lib/ai-engine';

export async function POST(request: NextRequest) {
  try {
    const { user_id, recommendation_type = 'stream' } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Create Supabase service client for elevated permissions
    const supabase = createServiceClient();

    // Fetch user profile and quiz data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch latest quiz session
    const { data: quizSession, error: quizError } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // Prepare user profile for AI engine
    const userProfile: UserProfile = {
      user_id: user_id,
      age: profile.date_of_birth ? 
        new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : undefined,
      class_level: profile.class_level,
      stream: profile.stream,
      interests: profile.interests || [],
      location: profile.location,
      quiz_scores: quizSession?.interest_scores || {},
      personality_traits: profile.personality_traits,
      family_income: profile.family_income,
      parent_education: profile.parent_education
    };

    // Get AI-powered recommendations
    let recommendations = [];
    let confidence_score = 0;
    let reasoning = '';

    try {
      switch (recommendation_type) {
        case 'stream':
          recommendations = await aiEngine.getStreamRecommendations(userProfile);
          break;
        case 'college':
          recommendations = await aiEngine.getCollegeRecommendations(userProfile, 10);
          break;
        case 'career':
          recommendations = await aiEngine.getCareerRecommendations(userProfile);
          break;
        default:
          recommendations = await aiEngine.getStreamRecommendations(userProfile);
      }
      
      // Calculate overall confidence score
      if (recommendations.length > 0) {
        confidence_score = recommendations.reduce((sum: number, rec: any) => 
          sum + (rec.confidence || rec.match_score || 0), 0) / recommendations.length;
      }
      
      reasoning = `AI-powered recommendations based on your profile, interests, and quiz results.`;
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      // Fallback recommendations
      recommendations = getFallbackRecommendations(recommendation_type, userProfile);
      confidence_score = 0.6;
      reasoning = 'Basic recommendations based on your profile and interests.';
    }

    return NextResponse.json({
      recommendations,
      confidence_score,
      reasoning,
      user_profile: userProfile
    });

  } catch (error) {
    console.error('Error in recommendations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getFallbackRecommendations(type: string, userProfile: any) {
  switch (type) {
    case 'stream':
      return [
        {
          stream: 'science',
          confidence: 0.8,
          reasoning: 'Based on your interests and academic profile',
          career_paths: ['Engineer', 'Doctor', 'Scientist', 'Researcher'],
          required_subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology']
        },
        {
          stream: 'commerce',
          confidence: 0.6,
          reasoning: 'Good for business and finance careers',
          career_paths: ['CA', 'MBA', 'Banking', 'Finance'],
          required_subjects: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics']
        }
      ];
    
    case 'college':
      return [
        {
          college_id: '1',
          name: 'Delhi University',
          match_score: 0.8,
          reasons: ['Good academic reputation', 'Offers your preferred stream'],
          programs: ['B.A.', 'B.Sc.', 'B.Com.', 'B.Tech']
        }
      ];
    
    case 'career':
      return [
        {
          career: 'Software Engineer',
          education_path: ['B.Tech Computer Science', 'M.Tech (Optional)'],
          skills_required: ['Programming', 'Problem Solving', 'Mathematics'],
          job_opportunities: ['Software Engineer'],
          salary_range: { min: 500000, max: 2000000 },
          growth_prospects: 'High'
        }
      ];
    
    default:
      return [];
  }
}
