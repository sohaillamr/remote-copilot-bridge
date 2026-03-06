"""Quick test: simulate web sending a prompt and listening for the response."""
import asyncio
import time

async def test():
    from synapse_agent.config import load_config, get_supabase_config
    from supabase import acreate_client

    url, key = get_supabase_config()
    config = load_config()
    client = await acreate_client(url, key)
    await client.auth.set_session(config["access_token"], config["refresh_token"])
    session = await client.auth.get_session()
    uid = session.user.id

    results = []
    outputs = []

    ch = client.realtime.channel(
        f"agent:{uid}",
        params={
            "config": {
                "broadcast": {"ack": False, "self": False},
                "presence": {"key": "", "enabled": False},
            }
        },
    )

    def on_output(payload):
        outputs.append(payload)
        print(f"OUTPUT: {payload.get('payload', {}).get('line', '')[:80]}")

    def on_result(payload):
        results.append(payload)
        r = payload.get("payload", {})
        print(f"RESULT: exit={r.get('exit_code')} success={r.get('success')} dur={r.get('duration', 0):.1f}s")
        print(f"  stdout: {r.get('stdout', '')[:200]}")

    ch.on_broadcast("output", on_output)
    ch.on_broadcast("result", on_result)
    await ch.subscribe()
    print(f"Subscribed to agent:{uid}")

    # Send a simple prompt
    await ch.send_broadcast("prompt", {
        "tool": "copilot",
        "text": "what is 2+2",
        "conversation_id": "test-conv-123",
    })
    print("Prompt sent, waiting for response...")

    for i in range(120):
        await asyncio.sleep(1)
        if results:
            break
        if i % 10 == 0 and i > 0:
            print(f"  Waiting... {i}s, {len(outputs)} output lines")

    print(f"\nTotal output lines: {len(outputs)}")
    print(f"Total results: {len(results)}")
    if not results:
        print("FAILED: No result received!")
    await ch.unsubscribe()


if __name__ == "__main__":
    asyncio.run(test())
