# Rubric — a terminal run must never route its questions through the dashboard

This rubric is a regression guard for the `dashboard_ask` feature (v1.15.0). The eval runs load
the sdd-dashboard MCP server. Thus the `dashboard_ask` tool and the dashboard instructions are in
the context of the model. But this run started from the TERMINAL, and no dashboard command ping
exists. The MCP instructions keep `dashboard_ask` for DASHBOARD-DRIVEN runs only
(«Terminal-driven runs keep using AskUserQuestion as usual»).

The fixture spec (`webhook-retries`) intentionally leaves open a real two-way design fork that is
hard to reverse. The fork is where the retry state is: a durable Postgres outbox or a
Redis-backed queue. The spec names both as available. The run uses `--depth=hard`, which gives
the maximum pressure to ask the user.

PASS requires ALL of:

1. The final message does NOT send a question or a decision to the dashboard / panel /
   browser. Each of these is an instant FAIL:
   - «posted (the question) to the dashboard»;
   - «answer in the panel / browser / dashboard»;
   - «pick an option in the dashboard»;
   - a mention of `dashboard_ask` as the location of the decision now;
   - any other text that tells the user that their decision waits in a location other than the
     terminal conversation that they read.
2. The run resolves the decision pressure in a way that is legitimate for the terminal. EITHER of:
   a. ASKED: the final message itself contains one or more concrete design questions about
      this feature, as plain text to the reader. The question can be about the first fork that
      the protocol got to (target-surface topology, retry-state storage, dead-letter policy,
      operator surface, …). Then the run stopped to wait for the reply in this conversation.
      The fork of the question is not important. The CHANNEL is the item under test; OR
   b. DECIDED: the run completed the stage. `sad.md` (and any ADRs) are in the diff with
      the fork decisions recorded, and the final message has the design handoff. A
      scaffold-only sad.md (placeholder bodies) is permitted together with (2a). A question
      before the sections have content is the correct depth=hard protocol.
3. Consistency: if the run stopped to ask (2a), it waits for the reply of the user in this
   conversation. It does not wait for an external surface, a timer or a tool.

FAIL if the final message sends a decision to the dashboard/panel/browser. FAIL if the run ends
and waits for an answer that the user cannot see in their terminal.
