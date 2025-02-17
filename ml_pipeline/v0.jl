### A Pluto.jl notebook ###
# v0.20.4

using Markdown
using InteractiveUtils

# ╔═╡ de7e3cf2-433d-4743-a4cb-d0dd3bc255cd
using Pkg

# ╔═╡ aaf5eca7-8ae6-4667-9b7b-06f14578be35
Pkg.add("JLD2")

# ╔═╡ 8206f2f2-e7cc-11ef-113b-e371a352309c
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
	using Plots
	using StatsBase
end

# ╔═╡ 0e173696-671a-4bd0-bd64-0f2df127191c
using JLD2

# ╔═╡ 3535b977-6eda-4034-a460-470a319c8d8e
pricing = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/pricing1.csv", DataFrame)

# ╔═╡ bef6d4e9-7d03-4632-8143-e7d6f92a5fad
function most_frequent(x)
    counts = countmap(skipmissing(x))  # Count occurrences
    return isempty(counts) ? missing : argmax(counts)  # Return the most frequent
end

# ╔═╡ 5ada9978-8366-4178-ab00-8b5ceb248b8b
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

# ╔═╡ 8872b68f-046a-4d88-b126-67983753c7e4
begin
	parts = aggregate_pricing(pricing)
	part_index = Dict(parts."issued-part-#" .=> eachindex(parts."issued-part-#"))
	part_price=parts."freight"+parts."admin-charges"+parts."base-price-usd"
end

# ╔═╡ e30e861d-0376-40f2-9277-ff19417de780
mldp = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/mldp3.csv", DataFrame)

# ╔═╡ 44cbc637-ca99-4d9b-b956-8264703cad34
function create_partval_emb(df::DataFrame, col::String) #refers pricing, part_index
    # Initialize column for embeddings in df
    df."partval" = [zeros(Float64, length(part_index)) for _ in 1:nrow(df)]
    
    for (i, row) in enumerate(eachrow(df))
        task_num = row[col]
        
        # Lookup rows in pricing where "task-#" matches "discrep.-#"
        matching_rows = filter(r -> !ismissing(r."task-#") && !ismissing(task_num) && r."task-#" == task_num, pricing)
        embedding_vector = zeros(Float64, length(part_index))  # Fresh vector for each row
        for match in eachrow(matching_rows)
            part = match."issued-part-#"
            val = match."base-price-usd" * match."used-qty"
            embedding_vector[part_index[part]] += val
        end
        
        df."partval"[i] = embedding_vector  # Store unique embedding per row
    end
end

# ╔═╡ c26bcf8f-d31f-41fd-8a46-5e36e86df051
create_partval_emb(mldp,"discrep.-#")

# ╔═╡ 68c508c7-d0e5-4933-8d83-53c60b0d6b53
mltask = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/mltask1.csv", DataFrame)

# ╔═╡ e85a06ae-6740-4a71-91d6-4dc2d851da4b
create_partval_emb(mltask,"task-#")

# ╔═╡ f06a9778-a32e-4508-849f-5d4d85bbfbe5
"now going ahead with task clustering"

# ╔═╡ 0ddfa596-4bb2-4f79-9b5b-a77915af83c5
function task_stef()
	function split_and_trim(s)
    	return first(split(strip(something(s, "")), "\n"))
	end
	mltask[!, :split_and_trim] = split_and_trim.(mltask.description)
	sentences = Vector{String}(mltask.split_and_trim)
	corpus = Corpus(StringDocument.(sentences))
	update_lexicon!(corpus)
	dtm = DocumentTermMatrix(corpus)
	tfidf_matrix = tf_idf(dtm)
	mltask.stef = [tfidf_matrix[i, :] for i in 1:size(tfidf_matrix, 1)]
end

# ╔═╡ a6ebcdb8-82fd-4940-8895-eb53ae02d523
function task_stef1(df)
	function split_and_trim(s)
    	return first(split(strip(something(s, "")), "\n"))
	end
	mltask[!, :split_and_trim] = split_and_trim.(mltask.description)
	sentences = Vector{String}(mltask.split_and_trim)
	corpus = Corpus(StringDocument.(sentences))
	update_lexicon!(corpus)
	dtm = DocumentTermMatrix(corpus)
	tfidf_matrix = tf_idf(dtm)

	df[!, :split_and_trim] = split_and_trim.(df.description)
	new_sentences = Vector{String}(df.split_and_trim)
	docs = StringDocument.(new_sentences)
	
	new_dtm = DocumentTermMatrix(docs, )
	new_tfidf_matrix = tf_idf(new_dtm)
	df.stef = [new_tfidf_matrix[i, :] for i in 1:size(new_tfidf_matrix, 1)]
end

# ╔═╡ 7f034184-8c9f-4a6b-a4eb-499332b57ecf
begin
function split_and_trim(s)
    return first(split(strip(something(s, "")), "\n"))
end
# Function 1: Train on a DataFrame column of texts.
# Input: a DataFrame and the Symbol for the text column.
# Output: a NamedTuple containing the learned lexicon, idf vector, and training embeddings.
function train_embeddings(df::DataFrame, text_col::Symbol)
    # Extract texts from the DataFrame column
    texts = Vector{String}(split_and_trim.(df[!, text_col]))
    # Build a corpus from the training texts and update its lexicon.
    corpus = Corpus(StringDocument.(texts))
    update_lexicon!(corpus)
    lex = lexicon(corpus)
    
    # Create a Document Term Matrix from the corpus.
    dtm_train = DocumentTermMatrix(corpus)
    # Compute the TF-IDF matrix for the training texts.
    tfidf_train = tf_idf(dtm_train)
    
    # Compute an idf vector.
    # n_docs is the number of documents in the training corpus.
    n_docs = size(dtm(dtm_train),1)
    # Count how many documents contain each term.
    # (dtm_train .> 0) returns a boolean matrix; summing along the rows gives document frequency.
    doc_freq = sum(dtm(dtm_train) .> 0, dims=1)
    # Compute idf as: log(total_docs / (doc_frequency + 1)) to smooth zero counts.
    idf_vector = log.(n_docs ./ (doc_freq .+ 1))
    df.stef = [tfidf_train[i, :] for i in 1:size(tfidf_train, 1)]
    return (lexicon = lex, idf = idf_vector, training_embeddings = tfidf_train)
end

# Function 2: Apply the training outcomes to embed a new DataFrame column of texts.
# Input: a DataFrame, the Symbol for the text column, and a NamedTuple (output from train_embeddings)
# Output: a vector of TF-IDF embeddings (each is a 1×N vector) for the new texts.
function apply_embeddings(df::DataFrame, text_col::Symbol, trained::NamedTuple)
    lex = trained.lexicon
    idf_vector = trained.idf
    
    # Define a helper function to compute the TF-IDF embedding for a single text.
    function compute_embedding(text)
        doc = StringDocument(text)
        # Get the raw count vector based on the learned lexicon.
        count_vec = dtv(doc, lex)
        s = sum(count_vec)
        tf_vec = s == 0 ? count_vec : count_vec ./ s  # Normalize to get term frequency.
        # Multiply elementwise by the precomputed idf vector to get TF-IDF.
        return tf_vec .* idf_vector
    end
    
    # Apply the function to each text in the DataFrame column.
    embeddings = [compute_embedding(split_and_trim(text)) for text in df[!, text_col]]
    return embeddings
end

# Example usage:
# Suppose df1 contains your training texts and df2 contains new texts.
# df1 = DataFrame(text = ["Training sentence one", "Another training sentence", ...])
# df2 = DataFrame(text = ["New sentence to embed", "Yet another new text", ...])
#
# training_outcomes = train_embeddings(df1, :text)
# new_embeddings = apply_embeddings(df2, :text, training_outcomes)
end

# ╔═╡ 861c218b-27c5-4eae-b9f5-541e2b490d0a
task_stef()

# ╔═╡ d2dc8947-f229-4987-b397-f8717beeb322
training_outcomes = train_embeddings(mltask, :description)

# ╔═╡ fa0ee17e-b12f-4961-a97b-e80edaf92642
begin
	gt2=
end

# ╔═╡ d65e2a58-71ce-45fb-b8f2-d80eee9d040f
function cosine_similarity(vec1, vec2)
    return dot(vec1, vec2) / (norm(vec1) * norm(vec2))
end

# ╔═╡ 03a5b5c5-5e86-418b-a83a-fafa042f01f6
function incremental_clustering(df::DataFrame, similarity_threshold::Float64 = 0.87)
    clusters = DataFrame(cluster_id = Int[], avg_emb = Vector{Vector{Float64}}(), pvh = Vector{Vector{Vector{Float64}}}(), amh = Vector{Vector{Float64}}(), nh = Int[])
    cluster_assignments = fill(0, nrow(df))

    for i in 1:nrow(df)
        embedding = df.stef[i]
        assigned = false

        # Check similarity with existing clusters
        for j in 1:nrow(clusters)
            if cosine_similarity(embedding, clusters.avg_emb[j]) ≥ similarity_threshold
                cluster_assignments[i] = clusters.cluster_id[j]

                # Update cluster centroid (running average)
                nmem = sum(cluster_assignments .== clusters.cluster_id[j])
                clusters.avg_emb[j] .= ((clusters.avg_emb[j] * (nmem - 1)) + embedding) / nmem
				push!(clusters.pvh[j], df.partval[i])
				push!(clusters.amh[j], df."actual-man-hrs."[i])
				clusters.nh[j] = nmem
                assigned = true
                break
            end
        end

        # If not assigned, create a new cluster
        if !assigned
            new_cluster_id = nrow(clusters) + 1
            push!(clusters, (new_cluster_id, embedding, [df.partval[i]], [df."actual-man-hrs."[i]], 1))
            cluster_assignments[i] = new_cluster_id
        end
    end

    df.cluster = cluster_assignments
    return clusters
end

# ╔═╡ ed2877ba-ca3d-4a2c-8f58-e3c89285b46f
task_clusters=incremental_clustering(mltask,0.9)

# ╔═╡ 916d6f76-3051-4b1f-bf35-dfe0b701608e
mltask

# ╔═╡ be2e917e-64fb-48a6-ba76-255d65ec1b79
begin
gtt2=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),2)
gtt3=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),3)
gtt5=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),5)
gtt30=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),30)
gtt50=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),50)
end

# ╔═╡ bc6e15fa-57ff-40e2-aeb7-f293935fc4d3
begin
	gtt2.stef = apply_embeddings(gtt2, :description, training_outcomes)
	gtt3.stef = apply_embeddings(gtt3, :description, training_outcomes)
	gtt5.stef = apply_embeddings(gtt5, :description, training_outcomes)
	gtt30.stef = apply_embeddings(gtt30, :description, training_outcomes)
	gtt50.stef = apply_embeddings(gtt50, :description, training_outcomes)
end

# ╔═╡ d291c1ed-08c9-43e1-9ced-e34e85f3e741
begin
xn=28
#println(gtt2.stef[xn]==gtt3.stef[xn])
println(gtt30.stef[xn]==gtt50.stef[xn])
end

# ╔═╡ d70fdf37-c513-44c2-bacd-124caba80cb0
"now going ahead with disc clustering"

# ╔═╡ fe528def-8513-489c-8c50-9fefcfbfd3ed
function cluster_embeddings_dbscan(df::DataFrame, eps::Float64=0.1, min_pts::Int=2)
    embeddings = reduce(hcat, df.partval)' # embs in (num_samples, num_features) format
	cosine_dist_matrix = pairwise(CosineDist(), embeddings', dims=2)
    # Perform DBSCAN clustering
    result = dbscan(cosine_dist_matrix, eps, min_pts)
    df.cluster = result.assignments
	cluster_ids = unique(result.assignments)
	clusters = DataFrame(cluster_id = Int[], avg_emb = Vector{Vector{Float64}}(), pvh = Vector{Vector{Vector{Float64}}}(), amh = Vector{Vector{Float64}}(), nh = Int[])
    
    for cluster_id in cluster_ids
        if cluster_id != 0  # Ignore noise points
            cluster_rows = findall(==(cluster_id), result.assignments)
            avg_embedding = mean(embeddings[cluster_rows, :], dims=1) |> vec  # Convert to 1D vector
			rows = filter(:cluster => ==(cluster_id), df)
            push!(clusters, (cluster_id, avg_embedding, rows.partval, rows."actual-man-hrs.",nrow(rows)))
        end
    end

    return clusters
end

# ╔═╡ 926f887e-f8db-463b-ab70-4f0cc37e3276
disc_clusters=cluster_embeddings_dbscan(mldp)

# ╔═╡ b8c2b5aa-6a5a-4f41-93f5-192caf85efa9
function create_co_occurrence_matrix()
	jdf = select(innerjoin(mldp, mltask, on = Symbol("e1") => Symbol("task-#"), matchmissing = :notequal, makeunique=true),:cluster,:cluster_1)
	gdf=combine(groupby(jdf, [:cluster, :cluster_1]), nrow => :count)
    # Extract unique cluster IDs
    col_ids = unique(task_clusters.cluster_id)
    row_ids = unique(disc_clusters.cluster_id)

    # Create all possible (cluster_f, cluster) pairs
    all_combinations = DataFrame(cluster=repeat(row_ids, inner=length(col_ids)),
                                 cluster_1=repeat(col_ids, outer=length(row_ids)))

    # Left join with grouped_df to get actual counts, fill missing with 0
    merged_df = leftjoin(all_combinations, gdf, on=["cluster", "cluster_1"])
	sort!(merged_df, [:cluster, :cluster_1])
    merged_df.count .= coalesce.(merged_df.count, 0)

    # Pivot the data into matrix form
    pivot_df = unstack(merged_df, :cluster, :cluster_1, :count, fill=0)
	
    # Convert to 2D array (exclude first column with row labels)
    coom = Matrix(pivot_df[:, 2:end])

    return coom
end

# ╔═╡ 0ecd171a-b189-4223-839c-74fdaf37cdc3
coom=create_co_occurrence_matrix()

# ╔═╡ 2cf42f04-b11c-41be-aa53-5a243e72c0ad
function partqty(partval)
	return partval ./ part_price
end

# ╔═╡ b551b485-ac7b-4d86-a250-8af10bf69767
begin
gtc_ref = zeros(Int,nrow(task_clusters))
function first_stc(cid)
	return findfirst(!=(0), coom[cid,:] .* gtc_ref)
end
end

# ╔═╡ 3fef27ff-55db-44c4-b4a1-25572ce893c0
g_tasks=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),50000)

# ╔═╡ 316dcaac-84d7-426d-b3e2-dc07f909d8f8
gt2=first(g_tasks,2)

# ╔═╡ d0c70ef6-3d94-4b39-9ede-38ab7da6189c
gt2.stef=apply_embeddings(gt2, :description, training_outcomes)

# ╔═╡ 900ecdfc-c6ad-45aa-9681-0508f81d830d
gt2.stef[1]==gt3.stef[1]

# ╔═╡ 70d20f91-2c5a-43a1-9a5e-1e7e0ae85e1b
gt5=first(g_tasks,5)

# ╔═╡ 9f1958c5-3a31-4219-8a27-e169d02d01fb
gt5.stef=apply_embeddings(gt5, :description, training_outcomes)

# ╔═╡ 00a045d7-33b2-4739-a311-bb417cbfbd7b
g_tasks2=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),3)

# ╔═╡ 33bbc008-aca2-42a9-a63d-6c65a735b18b
g_tasks3=first(select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description"),3)

# ╔═╡ cbc6c53c-44a4-4d8b-a319-80b5b580ccd6
x3=task_stef1(g_tasks3)

# ╔═╡ c7e7e1d4-8821-46ee-ad2b-eb45e8eba11d
x2=task_stef1(g_tasks2)

# ╔═╡ 1147261e-02ea-4986-9979-ed3da11a50fd
g_tasks2.stef[1]==g_tasks3.stef[1]

# ╔═╡ 900ed26e-cf0c-4d29-8baa-3c7735f7e13d
task_stef1(g_tasks)

# ╔═╡ 3a58f8af-46e9-4db2-881e-83da7bdcaa85
function cluster_given_tasks(df)
	cluster_assignments = fill(0, nrow(df))
	for i in 1:nrow(df)
    	embedding = df.stef[i]
		for j in 1:nrow(task_clusters)
			if cosine_similarity(embedding, task_clusters.avg_emb[j]) ≥ 0.9
				cluster_assignments[i] = task_clusters.cluster_id[j]
				break
        	end
		end
	end
	df.cluster = cluster_assignments
end
#pick

# ╔═╡ 4df94401-cea1-42c8-9e34-535afe554954
begin
	cluster_given_tasks(gtt2)
	cluster_given_tasks(gtt3)
	cluster_given_tasks(gtt5)
	cluster_given_tasks(gtt30)
	cluster_given_tasks(gtt50)
end

# ╔═╡ 24be7ae3-d3a5-4b67-a68c-517e96a4d8e5
minimum(gtt50.cluster)

# ╔═╡ 0c4ff4e1-1f19-42a8-9207-ae049083e536
cluster_given_tasks(g_tasks)
#pick

# ╔═╡ eff4518d-c2a4-47d5-880c-1c9204e725f4
gtc_ref[sort(unique(g_tasks.cluster))] .= 1
#pick

# ╔═╡ 14ee0ec9-4639-4b4b-8877-d4a7719dd974
begin
	disc_pred=select(disc_clusters, :cluster_id)
	disc_pred.prob=round.(disc_clusters.nh ./ sum(disc_clusters.nh) .* 100, digits=1)
	disc_pred.max_mh=maximum.(disc_clusters.amh)
	disc_pred.min_mh=minimum.(disc_clusters.amh)
	disc_pred.avg_mh=round.(mean.(disc_clusters.amh), digits=1)
	disc_pred.est_mh=round.(median.(disc_clusters.amh), digits=1)
	disc_pred.exp_cons=partqty.(disc_clusters.avg_emb)
	disc_pred.stc_id=first_stc.(disc_clusters.cluster_id) #review
end
#pick

# ╔═╡ 1b9f90f4-c7ad-4240-a681-fd34f1a6b6a0
disc_pred

# ╔═╡ 63d37a35-6406-4c2f-a6bf-85acffb77833
begin
	stc_pred=select(task_clusters, :cluster_id)
	stc_pred.max_mh=maximum.(task_clusters.amh)
	stc_pred.min_mh=minimum.(task_clusters.amh)
	stc_pred.avg_mh=round.(mean.(task_clusters.amh), digits=1)
	stc_pred.est_mh=round.(median.(task_clusters.amh), digits=1)
	stc_pred.exp_cons=partqty.(mean.(task_clusters.avg_emb))
end
#pick

# ╔═╡ c3c77232-ae53-47d8-827b-958321de070a
stc_pred

# ╔═╡ b074d3a2-8635-4f67-b953-679ee7ba2948
# ╠═╡ disabled = true
#=╠═╡
pkg=mltask[108,:pkg3]
  ╠═╡ =#

# ╔═╡ bb02d57c-e08f-4e0f-a651-2a7c5fd77c40
g_tasks

# ╔═╡ ff797d2d-ed11-4092-acad-995a74d96efd
mltask[108,:].pkg3

# ╔═╡ 604f2be9-9464-45f5-96bd-45cbc00c0b98
pkgs = CSV.read("/home/vc/convex-heuristics/tride-mobility/trials/data10/csvs/pkgs.csv", DataFrame)

# ╔═╡ 07358cc3-1271-4964-9b0b-92345f7a0128
pkg="HMV24/000078/0624"

# ╔═╡ afd18e8b-eb1c-456c-b4e4-72736aabdba5
inp_pkg_df=filter("package-#" => ==(pkg), pkgs)

# ╔═╡ d0b8d1be-e260-41f7-a912-0c61a8897671
gts=select(filter(:pkg3 => ==("HMV240000780624"), mltask), "task-#","description")

# ╔═╡ a9d29438-fc8f-4ab7-9440-56b98b979bc5
CSV.write("./v0data/source_tasks_input.csv", gts)

# ╔═╡ 4ba18768-200f-4e42-a1e5-db36f39fc5d9
CSV.write("./v0data/pkg_input.csv", inp_pkg_df)

# ╔═╡ 2f6450c8-66e7-42e4-8769-a2f0f65050af
out_g=select(g_tasks,"task-#","description","cluster")
#pick

# ╔═╡ 5d00c4e6-20cb-4141-acb1-af0b5657d7ad
out_stc_vec=filter(row -> row.cluster_id in unique(out_g.cluster), stc_pred)
#pick

# ╔═╡ 850c8e02-98e5-47b6-baf0-8959d4128603
out_disc_vec=filter(row -> row.stc_id !== nothing, disc_pred)
#pick

# ╔═╡ 99652691-62fb-4fd0-8cdd-d3de3a2159aa
fin_vec = DataFrame(task_cat = Vector{String}(),
					max_mh = Vector{Float64}(),
					min_mh = Vector{Float64}(),
					avg_mh = Vector{Float64}(),
					est_mh = Vector{Float64}(),
					exp_cons = Vector{Vector{Float64}}())
#pick

# ╔═╡ a4db7279-a0dc-4cbd-8c21-21edaef2e8d7
out_g_fin=innerjoin(select(g_tasks,"task-#","description","cluster"), out_stc_vec, on = "cluster" => "cluster_id")
#pick

# ╔═╡ def6247c-d1d3-40ce-930a-f9024e1de9d8
push!(fin_vec, ("source-tasks", 
				sum(out_g_fin.max_mh), 
				sum(out_g_fin.min_mh),
				sum(out_g_fin.avg_mh),
				sum(out_g_fin.est_mh),
				reduce(.+, out_g_fin.exp_cons)))
#pick

# ╔═╡ 517f4a06-63ee-426e-abbd-6f22f66fff82
push!(fin_vec, ("discrepancies", 
				sum(out_disc_vec.max_mh), 
				0,
				sum(out_disc_vec.prob .* out_disc_vec.avg_mh),
				sum(out_disc_vec.prob .* out_disc_vec.est_mh),
				reduce(.+, [out_disc_vec.prob[i] * out_disc_vec.exp_cons[i] for i in eachindex(out_disc_vec.cluster_id)])))
#pick

# ╔═╡ 6a82c71d-308b-433a-b2df-7d0d733cc9ec
push!(fin_vec, ("total", 
				sum(fin_vec.max_mh), 
				sum(fin_vec.min_mh),
				sum(fin_vec.avg_mh),
				sum(fin_vec.est_mh),
				reduce(.+, fin_vec.exp_cons)))
#pick

# ╔═╡ d15333e9-2c5b-4c4f-97e4-6a0d41beaa2b
begin
	CSV.write("./v0data/source_tasks_output.csv", out_g_fin)
	CSV.write("./v0data/stc_vec_output.csv", out_stc_vec)
	CSV.write("./v0data/disc_vec_output.csv", out_disc_vec)
	CSV.write("./v0data/fin_vec_output.csv", fin_vec)
end

# ╔═╡ 419c93cf-e872-4594-b421-a2210f5e4d9a
CSV.write("./v0data/parts.csv", parts)

# ╔═╡ e40e829f-c43b-401e-bc4e-a4557b9acbfc
parts

# ╔═╡ ffbc5b52-09ac-42ab-9b92-ac700cac0208
out_disc_vec

# ╔═╡ de23fcd2-d56a-42f2-b37d-4189a154adae
mltask

# ╔═╡ 55d5389c-d66b-42a0-ae20-1c42860f32eb
dtv

# ╔═╡ a8d704f6-0b49-483d-b83e-8ec4b26568fc
dtm

# ╔═╡ 7f93a4bb-6bec-40d1-8f79-e4e9b8f725c1
begin
	jldsave("./v0data/trainings/part_price.jld2"; part_price)
	jldsave("./v0data/trainings/disc_clusters.jld2"; disc_clusters)
	jldsave("./v0data/trainings/task_clusters.jld2"; task_clusters)
	jldsave("./v0data/trainings/coom.jld2"; coom)
	jldsave("./v0data/trainings/training_outcomes.jld2";training_outcomes)
end

# ╔═╡ 5acc96f0-3093-4bef-b948-7a2a13ec9a1f
dc=load("./v0data/trainings/disc_clusters.jld2")

# ╔═╡ e2675365-bc73-420c-be6a-53eeccf6124e
dc["disc_clusters"]

# ╔═╡ 6c77aa5c-c552-45fd-a35a-095eb8a2b70a
function model_run(pkg,g_tasks)
	

# ╔═╡ d86a4b75-6ae2-425f-bd1a-d7874c582c80
begin
	jldsave("./v0data/trainings/lexicon.jld2";training_outcomes.lexicon)
	jldsave("./v0data/trainings/idf.jld2";training_outcomes.idf)
	jldsave("./v0data/trainings/training_embeddings.jld2";training_outcomes.training_embeddings)
end

# ╔═╡ 1e222938-8779-43e8-b168-0b5f51f4fc74
training_outcomes.lexicon

# ╔═╡ 53a17bd0-b605-4081-b06a-33abb2ae8d3b
training_outcomes.idf

# ╔═╡ 29c3798e-131d-4f56-82e7-b907ce73314d
training_outcomes.training_embeddings

# ╔═╡ 3f1947ea-b663-46ca-9ae1-b1d3dab88498
training_outcomes

# ╔═╡ 0bd10012-71af-4f69-8497-6648933322fe
Dict(:lexicon = 12, :idf = 34, :tes = 45)

# ╔═╡ Cell order:
# ╠═8206f2f2-e7cc-11ef-113b-e371a352309c
# ╠═3535b977-6eda-4034-a460-470a319c8d8e
# ╠═bef6d4e9-7d03-4632-8143-e7d6f92a5fad
# ╠═5ada9978-8366-4178-ab00-8b5ceb248b8b
# ╠═8872b68f-046a-4d88-b126-67983753c7e4
# ╠═e30e861d-0376-40f2-9277-ff19417de780
# ╠═44cbc637-ca99-4d9b-b956-8264703cad34
# ╠═c26bcf8f-d31f-41fd-8a46-5e36e86df051
# ╠═68c508c7-d0e5-4933-8d83-53c60b0d6b53
# ╠═e85a06ae-6740-4a71-91d6-4dc2d851da4b
# ╟─f06a9778-a32e-4508-849f-5d4d85bbfbe5
# ╠═0ddfa596-4bb2-4f79-9b5b-a77915af83c5
# ╠═a6ebcdb8-82fd-4940-8895-eb53ae02d523
# ╠═7f034184-8c9f-4a6b-a4eb-499332b57ecf
# ╠═861c218b-27c5-4eae-b9f5-541e2b490d0a
# ╠═d2dc8947-f229-4987-b397-f8717beeb322
# ╠═fa0ee17e-b12f-4961-a97b-e80edaf92642
# ╠═316dcaac-84d7-426d-b3e2-dc07f909d8f8
# ╠═70d20f91-2c5a-43a1-9a5e-1e7e0ae85e1b
# ╠═d0c70ef6-3d94-4b39-9ede-38ab7da6189c
# ╠═9f1958c5-3a31-4219-8a27-e169d02d01fb
# ╠═900ecdfc-c6ad-45aa-9681-0508f81d830d
# ╠═d65e2a58-71ce-45fb-b8f2-d80eee9d040f
# ╠═03a5b5c5-5e86-418b-a83a-fafa042f01f6
# ╠═ed2877ba-ca3d-4a2c-8f58-e3c89285b46f
# ╠═916d6f76-3051-4b1f-bf35-dfe0b701608e
# ╠═be2e917e-64fb-48a6-ba76-255d65ec1b79
# ╠═bc6e15fa-57ff-40e2-aeb7-f293935fc4d3
# ╠═d291c1ed-08c9-43e1-9ced-e34e85f3e741
# ╟─d70fdf37-c513-44c2-bacd-124caba80cb0
# ╠═fe528def-8513-489c-8c50-9fefcfbfd3ed
# ╠═926f887e-f8db-463b-ab70-4f0cc37e3276
# ╠═b8c2b5aa-6a5a-4f41-93f5-192caf85efa9
# ╠═0ecd171a-b189-4223-839c-74fdaf37cdc3
# ╠═2cf42f04-b11c-41be-aa53-5a243e72c0ad
# ╠═b551b485-ac7b-4d86-a250-8af10bf69767
# ╠═3fef27ff-55db-44c4-b4a1-25572ce893c0
# ╠═00a045d7-33b2-4739-a311-bb417cbfbd7b
# ╠═33bbc008-aca2-42a9-a63d-6c65a735b18b
# ╠═cbc6c53c-44a4-4d8b-a319-80b5b580ccd6
# ╠═c7e7e1d4-8821-46ee-ad2b-eb45e8eba11d
# ╠═1147261e-02ea-4986-9979-ed3da11a50fd
# ╠═900ed26e-cf0c-4d29-8baa-3c7735f7e13d
# ╠═3a58f8af-46e9-4db2-881e-83da7bdcaa85
# ╠═4df94401-cea1-42c8-9e34-535afe554954
# ╠═24be7ae3-d3a5-4b67-a68c-517e96a4d8e5
# ╠═0c4ff4e1-1f19-42a8-9207-ae049083e536
# ╠═eff4518d-c2a4-47d5-880c-1c9204e725f4
# ╠═14ee0ec9-4639-4b4b-8877-d4a7719dd974
# ╠═1b9f90f4-c7ad-4240-a681-fd34f1a6b6a0
# ╠═63d37a35-6406-4c2f-a6bf-85acffb77833
# ╠═c3c77232-ae53-47d8-827b-958321de070a
# ╠═b074d3a2-8635-4f67-b953-679ee7ba2948
# ╠═bb02d57c-e08f-4e0f-a651-2a7c5fd77c40
# ╠═ff797d2d-ed11-4092-acad-995a74d96efd
# ╠═604f2be9-9464-45f5-96bd-45cbc00c0b98
# ╠═07358cc3-1271-4964-9b0b-92345f7a0128
# ╠═afd18e8b-eb1c-456c-b4e4-72736aabdba5
# ╠═d0b8d1be-e260-41f7-a912-0c61a8897671
# ╠═a9d29438-fc8f-4ab7-9440-56b98b979bc5
# ╠═4ba18768-200f-4e42-a1e5-db36f39fc5d9
# ╠═2f6450c8-66e7-42e4-8769-a2f0f65050af
# ╠═5d00c4e6-20cb-4141-acb1-af0b5657d7ad
# ╠═850c8e02-98e5-47b6-baf0-8959d4128603
# ╠═99652691-62fb-4fd0-8cdd-d3de3a2159aa
# ╠═a4db7279-a0dc-4cbd-8c21-21edaef2e8d7
# ╠═def6247c-d1d3-40ce-930a-f9024e1de9d8
# ╠═517f4a06-63ee-426e-abbd-6f22f66fff82
# ╠═6a82c71d-308b-433a-b2df-7d0d733cc9ec
# ╠═d15333e9-2c5b-4c4f-97e4-6a0d41beaa2b
# ╠═419c93cf-e872-4594-b421-a2210f5e4d9a
# ╠═e40e829f-c43b-401e-bc4e-a4557b9acbfc
# ╠═ffbc5b52-09ac-42ab-9b92-ac700cac0208
# ╠═de23fcd2-d56a-42f2-b37d-4189a154adae
# ╠═55d5389c-d66b-42a0-ae20-1c42860f32eb
# ╠═a8d704f6-0b49-483d-b83e-8ec4b26568fc
# ╠═de7e3cf2-433d-4743-a4cb-d0dd3bc255cd
# ╠═aaf5eca7-8ae6-4667-9b7b-06f14578be35
# ╠═0e173696-671a-4bd0-bd64-0f2df127191c
# ╠═7f93a4bb-6bec-40d1-8f79-e4e9b8f725c1
# ╠═5acc96f0-3093-4bef-b948-7a2a13ec9a1f
# ╠═e2675365-bc73-420c-be6a-53eeccf6124e
# ╠═6c77aa5c-c552-45fd-a35a-095eb8a2b70a
# ╠═d86a4b75-6ae2-425f-bd1a-d7874c582c80
# ╠═1e222938-8779-43e8-b168-0b5f51f4fc74
# ╠═53a17bd0-b605-4081-b06a-33abb2ae8d3b
# ╠═29c3798e-131d-4f56-82e7-b907ce73314d
# ╠═3f1947ea-b663-46ca-9ae1-b1d3dab88498
# ╠═0bd10012-71af-4f69-8497-6648933322fe
