def generate_explanation(originality_score: float, similarity_results, query_features) -> str:
    explanation = []
    explanation.append(f"Originality Score: {originality_score:.2f}%")
    
    if originality_score < 40.0:
        explanation.append("Classification: LOW ORIGINALITY (High Duplicate Risk)\n")
    elif originality_score < 75.0:
        explanation.append("Classification: MEDIUM ORIGINALITY (Moderate Similarity)\n")
    else:
        explanation.append("Classification: HIGH ORIGINALITY (Novel Idea)\n")
        
    explanation.append("Top Similar Projects in Database:")
    
    # Loop over matched results
    for idx, row in similarity_results.iterrows():
        title = row.get("project_title", "Unknown Title")
        score = row.get("hybrid_score", 0.0) * 100
        explanation.append(f"- \"{title}\" (Similarity Score: {score:.1f}%)")
        
    explanation.append("\nConcept Matching Analysis:")
    # Highlight matched features of the best candidate
    if len(similarity_results) > 0:
        best_row = similarity_results.iloc[0]
        matched_feats = best_row.get("matched_features", [])
        unique_feats = best_row.get("unique_query_features", [])
        
        explanation.append("Matched Concepts (Shared with database):")
        if matched_feats:
            for item in matched_feats:
                if isinstance(item, dict) and 'feature_a' in item and 'feature_b' in item:
                    explanation.append(f"  * \"{item['feature_a']}\" matched with \"{item['feature_b']}\"")
                else:
                    explanation.append(f"  * \"{item}\"")
        else:
            explanation.append("  * No shared concepts found.")
            
        explanation.append("\nUnique Concepts (Exclusive to this project):")
        if unique_feats:
            for item in unique_feats:
                explanation.append(f"  * \"{item}\"")
        else:
            explanation.append("  * No unique concepts identified.")
            
    return "\n".join(explanation)
