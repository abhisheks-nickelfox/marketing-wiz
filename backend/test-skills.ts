import supabase from './src/config/supabase';

async function testSkillsTable() {
  console.log('Testing skills table structure...\n');
  
  // Test 1: Try to insert a skill with description and color
  console.log('Test 1: Creating a skill with description and color...');
  try {
    const { data, error } = await supabase
      .from('skills')
      .insert({
        name: 'TEST_SKILL_' + Date.now(),
        description: 'This is a test description',
        color: '#FF0000',
        category: null
      })
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Error creating skill:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('✅ Skill created successfully:');
      console.log(JSON.stringify(data, null, 2));
      
      // Clean up
      await supabase.from('skills').delete().eq('id', data.id);
      console.log('✅ Test skill deleted\n');
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
  
  // Test 2: Check existing skills
  console.log('Test 2: Fetching existing skills...');
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('id, name, category, description, color, created_at')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Error fetching skills:', error.message);
    } else {
      console.log('✅ Latest 3 skills:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
  
  process.exit(0);
}

testSkillsTable();
