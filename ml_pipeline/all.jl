### A Pluto.jl notebook ###
# v0.20.4

using Markdown
using InteractiveUtils

# ╔═╡ e0b53dc4-d4d7-480d-a8e3-be95e48717c6
begin
	using Pkg
	Pkg.add("StatsBase")
end

# ╔═╡ d5273726-e6dc-11ef-2271-7fb0afd898ea
begin
	using CSV
	using DataFrames
	using Transformers
	using Transformers.TextEncoders
	using Transformers.HuggingFace
	using LinearAlgebra
	using Statistics
	using TextAnalysis
	using Clustering
	using Distances
	using StatsBase
end

# ╔═╡ 9b4f894d-2605-4edc-87ce-e5d55da67adb
begin
	mldp = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/mldp3.csv", DataFrame)
	mltask = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/mltask1.csv", DataFrame)
	pricing = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/pricing1.csv", DataFrame)
	pkgs = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/pkgs.csv", DataFrame)
end

# ╔═╡ b22439b0-9d9b-4a40-bc29-5895f2c8553d
function most_frequent(x)
    counts = countmap(skipmissing(x))  # Count occurrences
    return isempty(counts) ? missing : argmax(counts)  # Return the most frequent value
end

# ╔═╡ 8205fc9a-cfc3-4f6a-b097-a0375b38980b
function aggregate_pricing(pricing::DataFrame)
    grouped_df = combine(groupby(pricing, "issued-part-#"),
        "part-description" => most_frequent => "part-description",
        "issued-uom" => most_frequent => "issued-uom",
        "freight" => mean ∘ skipmissing => "freight",
        "admin-charges" => mean ∘ skipmissing => "admin-charges",
        "base-price-usd" => mean ∘ skipmissing => "base-price-usd"
    )
    return grouped_df
end

# ╔═╡ dfd293b7-149a-48ce-baef-bee6759665d5
parts = aggregate_pricing(pricing)

# ╔═╡ 4545ee15-1c83-462d-96bd-e97f6d7a8bd7
function split_and_trim(s)
    return first(split(strip(something(s, "")), "\n"))
end

# ╔═╡ 9f8bc03f-012f-4ad0-ad82-df6719a4954a
mltask[!, :split_and_trim] = split_and_trim.(mltask.description)

# ╔═╡ ab8d1224-3d40-4339-b997-dc89833cd77f
begin
	sentences = Vector{String}(mltask.split_and_trim)
	corpus = Corpus(StringDocument.(sentences))
	update_lexicon!(corpus)
	dtm = DocumentTermMatrix(corpus)
	tfidf_matrix = tf_idf(dtm)
end

# ╔═╡ f8b0e6ac-ad24-4672-981f-9f18a5ad01e6
mltask.stef = [tfidf_matrix[i, :] for i in 1:size(tfidf_matrix, 1)]

# ╔═╡ cf2a440e-7125-4fab-9c66-53f6fb7eda2c
function cosine_similarity(vec1, vec2)
    return dot(vec1, vec2) / (norm(vec1) * norm(vec2))
end

# ╔═╡ 73f8440d-7b95-4d80-9efe-c74aecba01da
function incremental_clustering_f(df::DataFrame, similarity_threshold::Float64 = 0.87)
    clusters = DataFrame(cluster_id = Int[], avg_embedding = Vector{Vector{Float64}}())
    cluster_assignments = fill(0, nrow(df))

    for i in 1:nrow(df)
        embedding = df.stef[i]
        assigned = false

        # Check similarity with existing clusters
        for j in 1:nrow(clusters)
            if cosine_similarity(embedding, clusters.avg_embedding[j]) ≥ similarity_threshold
                cluster_assignments[i] = clusters.cluster_id[j]

                # Update cluster centroid (running average)
                n_cluster_members = sum(cluster_assignments .== clusters.cluster_id[j])
                clusters.avg_embedding[j] .= ((clusters.avg_embedding[j] * (n_cluster_members - 1)) + embedding) / n_cluster_members

                assigned = true
                break
            end
        end

        # If not assigned, create a new cluster
        if !assigned
            new_cluster_id = nrow(clusters) + 1
            push!(clusters, (new_cluster_id, embedding))
            cluster_assignments[i] = new_cluster_id
        end
    end

    df.cluster_f = cluster_assignments
    return clusters
end

# ╔═╡ c1e1ae5d-c102-4e74-859c-9a93f98a556a
task_cluster_f=incremental_clustering_f(mltask)

# ╔═╡ b65dd0d6-07f5-40a0-904d-c6f692f8b06c
textencoder, bert_model = hgf"bert-base-uncased"

# ╔═╡ 80445a51-58e2-4c11-87bb-0f6f9caa898f
function emb(s)
    s=something(s, "")
    hs=bert_model(encode(textencoder, s)).hidden_state
    return mean(hs,dims=2)
end

# ╔═╡ a9d5a7b8-0297-4761-aa2d-6cb56cf7a001
mltask[!, :steb] = emb.(mltask.split_and_trim)

# ╔═╡ f00e5418-dcb2-4226-8fb3-732858063775
function incremental_clustering_b(df::DataFrame, similarity_threshold::Float64 = 0.87)
    clusters = DataFrame(cluster_id = Int[], avg_embedding = Vector{Vector{Float64}}())
    cluster_assignments = fill(0, nrow(df))

    for i in 1:nrow(df)
        embedding = vec(df.steb[i][:,:,1])
        assigned = false

        # Check similarity with existing clusters
        for j in 1:nrow(clusters)
            if cosine_similarity(embedding, clusters.avg_embedding[j]) ≥ similarity_threshold
                cluster_assignments[i] = clusters.cluster_id[j]

                # Update cluster centroid (running average)
                n_cluster_members = sum(cluster_assignments .== clusters.cluster_id[j])
                clusters.avg_embedding[j] .= ((clusters.avg_embedding[j] * (n_cluster_members - 1)) + embedding) / n_cluster_members

                assigned = true
                break
            end
        end

        # If not assigned, create a new cluster
        if !assigned
            new_cluster_id = nrow(clusters) + 1
            push!(clusters, (new_cluster_id, embedding))
            cluster_assignments[i] = new_cluster_id
        end
    end

    df.cluster_b = cluster_assignments
    return clusters
end

# ╔═╡ 0af0de61-1161-4769-8eca-f9155afae868
task_cluster_b=incremental_clustering_b(mltask)

# ╔═╡ 9c00c240-bb1c-4c84-850a-a6220e6f0905
function create_embedding(pricing::DataFrame, mldp::DataFrame)
    # Create a unique list from "issued-part-#" in pricing
    unique_parts = unique(pricing."issued-part-#")
    part_index = Dict(part => i for (i, part) in enumerate(unique_parts))
    
    # Initialize column for embeddings in mldp
    mldp."embedding" = [zeros(Float64, length(unique_parts)) for _ in 1:nrow(mldp)]
    
    for (i, row) in enumerate(eachrow(mldp))
        task_num = row."discrep.-#"
        
        # Lookup rows in pricing where "task-#" matches "discrep.-#"
        matching_rows = filter(r -> !ismissing(r."task-#") && !ismissing(task_num) && r."task-#" == task_num, pricing)
        embedding_vector = zeros(Float64, length(unique_parts))  # Fresh vector for each row
        for match in eachrow(matching_rows)
            part = match."issued-part-#"
            val = match."base-price-usd" * match."used-qty"
            embedding_vector[part_index[part]] += val
        end
        
        mldp."embedding"[i] = embedding_vector  # Store unique embedding per row
    end
end

# ╔═╡ 4940dc5b-3824-4629-95ed-6bdd6905586a
function cluster_embeddings_dbscan(mldp::DataFrame, eps::Float64=0.1, min_pts::Int=2)
    embeddings = reduce(hcat, mldp."embedding")'  # Ensure embeddings are in (num_samples, num_features) format
	cosine_dist_matrix = pairwise(CosineDist(), embeddings', dims=2)
    # Perform DBSCAN clustering
    result = dbscan(cosine_dist_matrix, eps, min_pts)
	#i have my doubts on this dbscan thing
    # Assign cluster labels
    mldp."cluster" = result.assignments
	
	cluster_ids = unique(result.assignments)

	cluster_averages = DataFrame(
        cluster_id = Int[], 
        average_embedding = Vector{Vector{Float64}}()
    )
    
    for cluster_id in cluster_ids
        if cluster_id != 0  # Ignore noise points
            cluster_rows = findall(==(cluster_id), result.assignments)
            avg_embedding = mean(embeddings[cluster_rows, :], dims=1) |> vec  # Convert to 1D vector
            push!(cluster_averages, (cluster_id, avg_embedding))
        end
    end

    return cluster_averages
end

# ╔═╡ 3c4855ce-85aa-4444-95bb-c0f2d146bb46
create_embedding(pricing, mldp)

# ╔═╡ 355194b5-77d3-4fa9-ae38-a39fab00b960
disc_cluster=cluster_embeddings_dbscan(mldp)

# ╔═╡ 88e84621-c096-4fd7-93f5-7e4334a3e8bb
function co_occurrence_matrix(mldp::DataFrame, mltask::DataFrame)
    # Step 1: Group by col1 and col2, then count occurrences
	df=select(innerjoin(mldp, mltask, on = Symbol("e1") => Symbol("task-#"), matchmissing = :notequal, makeunique=true),:cluster_f,:cluster)
    grouped = combine(groupby(df, [:cluster_f, :cluster]), nrow => :count)

    # Step 2: Pivot the DataFrame to create a contingency table
    pivot_df = unstack(grouped, :cluster_f, :count, fill=0)

    # Step 3: Convert the pivoted DataFrame to a matrix
    co_occurrence_matrix = Matrix(pivot_df[:, Not(:cluster)])

    # Optional: Set row and column names for better interpretability
    rownames = unique(df[!, :cluster])
    colnames = names(pivot_df)[2:end]  # Skip the first column which is col2
    return co_occurrence_matrix, rownames, colnames
end

# ╔═╡ 9f1571e2-8d7f-48e2-b356-e60bca4a090f
scxdcm,rnms,cnms = co_occurrence_matrix(mldp,mltask)

# ╔═╡ f0d0fdc3-c588-4604-b410-4d01c10a2776
xx=select(innerjoin(mldp, mltask, on = Symbol("e1") => Symbol("task-#"), matchmissing = :notequal, makeunique=true),:cluster_f,:cluster)

# ╔═╡ 1f05c932-5b4a-4000-a0f9-4b1167de3539
grouped = combine(groupby(xx, [:cluster_f, :cluster]), nrow => :count)

# ╔═╡ 603f9001-82ff-4726-9715-54386f6c9826
function create_co_occurrence_matrix(grouped_df::DataFrame, task_cluster_f::DataFrame, disc_cluster::DataFrame)
    # Extract unique cluster IDs
    row_ids = unique(task_cluster_f.cluster_id)
    col_ids = unique(disc_cluster.cluster_id)

    # Create all possible (cluster_f, cluster) pairs
    all_combinations = DataFrame(cluster_f=repeat(row_ids, inner=length(col_ids)),
                                 cluster=repeat(col_ids, outer=length(row_ids)))

    # Left join with grouped_df to get actual counts, fill missing with 0
    merged_df = leftjoin(all_combinations, grouped_df, on=["cluster_f", "cluster"])
    merged_df.count .= coalesce.(merged_df.count, 0)

    # Pivot the data into matrix form
    pivot_df = unstack(merged_df, :cluster_f, :cluster, :count, fill=0)
	col_order = vcat([:cluster_f], Symbol.(col_ids))  # Ensure correct order
    pivot_df = select(pivot_df, col_order...)
    # Convert to 2D array (exclude first column with row labels)
    co_occurrence_matrix = Matrix(pivot_df[:, 2:end])

    return co_occurrence_matrix, row_ids, col_ids
end

# ╔═╡ 7b4ad8cc-6325-4b31-86ab-c5577a47331e
com,rids,cids=create_co_occurrence_matrix(grouped,task_cluster_f,disc_cluster)

# ╔═╡ d470cfc8-4136-4331-82ff-e0aca325a0b7
begin
	row_ids = unique(task_cluster_f.cluster_id)
    col_ids = unique(disc_cluster.cluster_id)

    # Create all possible (cluster_f, cluster) pairs
    all_combinations = DataFrame(cluster_f=repeat(row_ids, inner=length(col_ids)),
                                 cluster=repeat(col_ids, outer=length(row_ids)))

    # Left join with grouped_df to get actual counts, fill missing with 0
    merged_df = leftjoin(all_combinations, grouped, on=["cluster_f", "cluster"])
	merged_df.count .= coalesce.(merged_df.count, 0)
	sort!(merged_df, [:cluster_f, :cluster])
    # Pivot the data into matrix form
    pivot_df = unstack(merged_df, :cluster_f, :cluster, :count, fill=0)
	
	#pivot_df = sort(pivot_df, :cluster_f)  # Sort rows
    #col_order = [:cluster_f; sort(Symbol.(setdiff(names(pivot_df), [:cluster_f])))]  # Sort columns
	#pivot_df = select(pivot_df, col_order)  # Reorder columns
	coom = Matrix(pivot_df[:, 2:end])
end

# ╔═╡ 47a28046-c441-410a-aae6-0e034d29c67d
coom

# ╔═╡ 1e6d0e50-9fa4-4604-9196-44a992f5a8b2
merged_df

# ╔═╡ 17d73110-5e5a-4294-8c0b-75ae8bce23f8
5631*247

# ╔═╡ Cell order:
# ╠═e0b53dc4-d4d7-480d-a8e3-be95e48717c6
# ╠═d5273726-e6dc-11ef-2271-7fb0afd898ea
# ╠═9b4f894d-2605-4edc-87ce-e5d55da67adb
# ╠═b22439b0-9d9b-4a40-bc29-5895f2c8553d
# ╠═8205fc9a-cfc3-4f6a-b097-a0375b38980b
# ╠═dfd293b7-149a-48ce-baef-bee6759665d5
# ╠═4545ee15-1c83-462d-96bd-e97f6d7a8bd7
# ╠═9f8bc03f-012f-4ad0-ad82-df6719a4954a
# ╠═ab8d1224-3d40-4339-b997-dc89833cd77f
# ╠═f8b0e6ac-ad24-4672-981f-9f18a5ad01e6
# ╠═cf2a440e-7125-4fab-9c66-53f6fb7eda2c
# ╠═73f8440d-7b95-4d80-9efe-c74aecba01da
# ╠═c1e1ae5d-c102-4e74-859c-9a93f98a556a
# ╠═b65dd0d6-07f5-40a0-904d-c6f692f8b06c
# ╠═80445a51-58e2-4c11-87bb-0f6f9caa898f
# ╠═a9d5a7b8-0297-4761-aa2d-6cb56cf7a001
# ╠═f00e5418-dcb2-4226-8fb3-732858063775
# ╠═0af0de61-1161-4769-8eca-f9155afae868
# ╠═9c00c240-bb1c-4c84-850a-a6220e6f0905
# ╠═4940dc5b-3824-4629-95ed-6bdd6905586a
# ╠═3c4855ce-85aa-4444-95bb-c0f2d146bb46
# ╠═355194b5-77d3-4fa9-ae38-a39fab00b960
# ╠═88e84621-c096-4fd7-93f5-7e4334a3e8bb
# ╠═9f1571e2-8d7f-48e2-b356-e60bca4a090f
# ╠═f0d0fdc3-c588-4604-b410-4d01c10a2776
# ╠═1f05c932-5b4a-4000-a0f9-4b1167de3539
# ╠═603f9001-82ff-4726-9715-54386f6c9826
# ╠═7b4ad8cc-6325-4b31-86ab-c5577a47331e
# ╠═d470cfc8-4136-4331-82ff-e0aca325a0b7
# ╠═47a28046-c441-410a-aae6-0e034d29c67d
# ╠═1e6d0e50-9fa4-4604-9196-44a992f5a8b2
# ╠═17d73110-5e5a-4294-8c0b-75ae8bce23f8
