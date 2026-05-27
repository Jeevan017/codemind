import os
import sys
import random
import requests
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    Faithfulness,
    AnswerRelevancy,
    ContextPrecision,
    ContextRecall
)
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.run_config import RunConfig
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from groq import Groq
from ingestion.indexer import load_bm25_index
from config import GROQ_API_KEY, GROQ_MODEL

API_URL = "http://127.0.0.1:8000"

# setup Groq as judge LLM
groq_llm = LangchainLLMWrapper(ChatGroq(
    groq_api_key=GROQ_API_KEY,
    model_name="llama-3.1-8b-instant",
    temperature=0
))

# setup free local embeddings
hf_embeddings = LangchainEmbeddingsWrapper(HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
))

# slow down to avoid Groq rate limiting
run_config = RunConfig(
    max_workers=1,
    max_wait=120,
    timeout=60
)

# initialize RAGAS metrics
faithfulness_metric = Faithfulness(llm=groq_llm)
answer_relevancy_metric = AnswerRelevancy(llm=groq_llm, embeddings=hf_embeddings)
context_precision_metric = ContextPrecision(llm=groq_llm)
context_recall_metric = ContextRecall(llm=groq_llm)


def call_api(question: str) -> dict:
    try:
        response = requests.post(
            f"{API_URL}/ask",
            json={"question": question},
            timeout=60
        )
        return response.json()
    except Exception as e:
        print(f"API call failed: {e}")
        return {
            "answer": "Error",
            "sources": [],
            "contexts": [],
            "decision": "ERROR"
        }


def generate_test_data(num_questions: int = 5) -> tuple:
    client = Groq(api_key=GROQ_API_KEY)

    print("\nAuto-generating test questions from indexed data...")

    try:
        bm25, chunks = load_bm25_index()
    except FileNotFoundError:
        print("No index found. Please index files first.")
        return [], []

    if not chunks:
        print("No chunks found in index.")
        return [], []

    sample_size = min(num_questions, len(chunks))
    sample_chunks = random.sample(chunks, sample_size)

    questions = []
    ground_truths = []

    for i, chunk in enumerate(sample_chunks):
        text = chunk["text"][:500]
        filename = chunk["filename"]

        print(f"Generating Q{i+1} from {filename}...")

        prompt = (
            f"Given this text from file '{filename}':\n\n"
            f"{text}\n\n"
            f"Generate one specific factual question about this text.\n"
            f"The question MUST start with 'According to {filename},' "
            f"so the system knows to search for it.\n"
            f"Then provide the exact correct answer from the text.\n\n"
            f"Reply in exactly this format with no extra text:\n"
            f"QUESTION: According to {filename}, <your question here>\n"
            f"ANSWER: <correct answer here>"
        )

        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.3
            )

            response_text = response.choices[0].message.content.strip()
            lines = response_text.split("\n")

            question = ""
            answer = ""

            for line in lines:
                if line.startswith("QUESTION:"):
                    question = line.replace("QUESTION:", "").strip()
                elif line.startswith("ANSWER:"):
                    answer = line.replace("ANSWER:", "").strip()

            if question and answer:
                questions.append(question)
                ground_truths.append(answer)
                print(f"Q: {question[:80]}...")
                print(f"A: {answer[:80]}...")
            else:
                print(f"Could not parse Q{i+1} — skipping")

        except Exception as e:
            print(f"Error generating Q{i+1}: {e}")
            continue

    print(f"\nGenerated {len(questions)} questions successfully.")
    return questions, ground_truths


def run_ragas_evaluation(num_questions: int = 5):
    print("\n" + "="*50)
    print("CODEMIND RAGAS EVALUATION")
    print("="*50)
    print("Judge LLM : Groq Llama 3.1 8B — free tier")
    print("Embeddings: MiniLM L6 v2 — local free")
    print("Mode      : Dynamic — questions auto-generated")
    print("API       : http://127.0.0.1:8000")
    print("="*50)

    # check API is running
    try:
        health = requests.get(f"{API_URL}/", timeout=5)
        print(f"API status: {health.json()['status']}")
    except Exception:
        print("ERROR: Backend API is not running.")
        print("Start it with: uvicorn main:app --reload")
        return

    questions_list, ground_truths_list = generate_test_data(num_questions)

    if not questions_list:
        print("No questions generated. Index files first.")
        return

    questions = []
    answers = []
    contexts = []
    ground_truths = []

    print("\n" + "-"*50)
    print("Running pipeline via API for each question...")
    print("-"*50)

    for i, question in enumerate(questions_list):
        print(f"\nQ{i+1}/{len(questions_list)}: {question}")

        result = call_api(question)

        answer = result.get("answer", "Error")
        sources = result.get("sources", [])
        context_texts = result.get("contexts", [])

        print(f"Answer  : {answer[:100]}...")
        print(f"Sources : {len(sources)} found")
        print(f"Contexts: {len(context_texts)} chunks")
        print(f"Decision: {result.get('decision', 'unknown')}")

        if not context_texts:
            context_texts = ["No context retrieved"]

        questions.append(question)
        answers.append(answer)
        contexts.append(context_texts)
        ground_truths.append(ground_truths_list[i])

    print("\nBuilding RAGAS dataset...")
    dataset = Dataset.from_dict({
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths
    })

    print(f"Dataset: {len(questions)} samples")
    print("Running RAGAS — takes 3-5 minutes on free tier...")

    try:
        results = evaluate(
            dataset=dataset,
            metrics=[
                faithfulness_metric,
                answer_relevancy_metric,
                context_precision_metric,
                context_recall_metric
            ],
            run_config=run_config
        )

        results_df = results.to_pandas()
        faith = results_df["faithfulness"].mean()
        relevancy = results_df["answer_relevancy"].mean()
        precision = results_df["context_precision"].mean()
        recall = results_df["context_recall"].mean()

    except Exception as e:
        print(f"RAGAS error: {e}")
        return

    print("\n" + "="*50)
    print("RAGAS EVALUATION RESULTS")
    print("="*50)
    print(f"Faithfulness:      {faith:.2f}")
    print(f"Answer Relevancy:  {relevancy:.2f}")
    print(f"Context Precision: {precision:.2f}")
    print(f"Context Recall:    {recall:.2f}")
    print("="*50)

    print("\nINTERPRETATION")
    print("-"*50)
    _interpret_score("Faithfulness", faith, "Answers grounded in context")
    _interpret_score("Answer Relevancy", relevancy, "Answers relevant to questions")
    _interpret_score("Context Precision", precision, "Retrieved chunks are relevant")
    _interpret_score("Context Recall", recall, "Retrieved chunks contain enough info")

    save_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "ragas_results.txt"
    )

    with open(save_path, "w") as f:
        f.write("CODEMIND RAGAS EVALUATION RESULTS\n")
        f.write("="*50 + "\n\n")
        f.write("Judge LLM : Groq Llama 3.1 8B\n")
        f.write("Embeddings: MiniLM L6 v2\n")
        f.write(f"Questions : {len(questions)}\n")
        f.write("Mode      : Dynamic auto-generation via API\n\n")
        f.write(f"Faithfulness:      {faith:.2f}\n")
        f.write(f"Answer Relevancy:  {relevancy:.2f}\n")
        f.write(f"Context Precision: {precision:.2f}\n")
        f.write(f"Context Recall:    {recall:.2f}\n\n")
        f.write("="*50 + "\n\n")
        f.write("QUESTION ANSWER PAIRS\n\n")
        for i, (q, a, gt) in enumerate(zip(questions, answers, ground_truths)):
            f.write(f"Q{i+1}: {q}\n")
            f.write(f"Ground Truth: {gt}\n")
            f.write(f"Answer: {a[:300]}\n\n")

    print(f"\nResults saved to {save_path}")
    return faith, relevancy, precision, recall


def _interpret_score(metric: str, score: float, description: str):
    if score != score:
        status = "timed out on free tier"
    elif score >= 0.8:
        status = "excellent"
    elif score >= 0.6:
        status = "good"
    elif score >= 0.4:
        status = "moderate"
    else:
        status = "low"
    print(f"{metric:<20} {score:.2f}  {status}  — {description}")


if __name__ == "__main__":
    run_ragas_evaluation(num_questions=5)