
from src.recommendation_engine.chatbot_engine import chatbot

USER_ID = "test_user"



def interactive():
    print("\n===== INTERACTIVE MODE =====\n")

    while True:
        user_input = input("YOU: ")

        if user_input.lower() in ["exit", "quit"]:
            break

        response = chatbot(USER_ID, user_input)

        print("\nBOT:")
        print(response)
        print("\n----------------------\n")



interactive()