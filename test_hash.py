import sys
sys.path.insert(0, 'D:\\College Work\\github projects\\PM_Intern')

try:
    from app.api.auth import hash_password
    print("Import successful")
    
    # Test hash_password
    result = hash_password("testpassword123")
    print(f"Hash result: {result}")
    print(f"Hash type: {type(result)}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
